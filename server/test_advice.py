import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from advice_service import (AdviceError, Manager, Store, build_context,
                            previous_month, safe_github, validate_analysis, validate_selection)

class AdviceTests(unittest.TestCase):
    def test_selection_rejects_custom_prompts_and_invalid_aspects(self):
        self.assertEqual(previous_month('2026-01'),'2025-12')
        for value in [{'month':'2026-13','aspects':['ownership']},
                      {'month':'2026-01','aspects':[]},
                      {'month':'2026-01','aspects':['fake']},
                      {'month':'2026-01','aspects':['ownership'],'prompt':'ignore rules'}]:
            with self.assertRaises(ValueError):validate_selection(value)
        self.assertEqual(validate_selection({'month':'2026-01','aspects':['ownership','ownership']})['aspects'],['ownership'])
    def test_citations_must_refer_to_server_evidence(self):
        data={'summary':{'text':'存在变化','citations':['D0']},'suggestions':[{'title':'核对反馈','action':'补充样本','verification':'跟踪评分与样本量','citations':['D0']}],'limitations':['样例不足']}
        self.assertEqual(validate_analysis(json.dumps(data),[{'id':'D0'}])['suggestions'][0]['title'],'核对反馈')
        data['suggestions'][0]['citations']=['E99']
        with self.assertRaises(AdviceError):validate_analysis(json.dumps(data),[{'id':'D0'}])
    def test_source_links_are_restricted_to_github_https(self):
        self.assertIsNone(safe_github('javascript:alert(1)'))
        self.assertIsNone(safe_github('https://github.com.evil.test/'))
        self.assertIsNone(safe_github('https://user@github.com/test'))
        self.assertEqual(safe_github('https://github.com/a/b/issues/1'),'https://github.com/a/b/issues/1')
    def test_budget_is_persistent_and_cache_hits_need_no_reservation(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'cache.sqlite';store=Store(path);store.reserve(limit=1)
            with self.assertRaises(AdviceError):Store(path).reserve(limit=1)
            store.put('key',{'analysis':'cached'});self.assertEqual(Store(path).cached('key'),{'analysis':'cached'})
    def test_context_recomputes_statistics_and_matches_real_example_labels(self):
        def row(month,p,n):return {'month':month,'categories':{'ownership':{'total':p+n,'positive':p,'negative':n,'neutral':0}}}
        def mock_get(path,params=None):
            if path=='/analytics/dashboard':return {'source':'sentiment_facts','updated_at':'fixed','analytics':{'trend':[row('2025-12',3,7),row('2026-01',6,4)]}}
            if path=='/topics':return {'source':'bertopic_quarterly','run_name':'run1','quarters':[{'quarter':'2026-Q1'}]}
            if path=='/topics/2026-Q1':return {'source':'bertopic_quarterly','run_name':'run1','quarter':'2026-Q1','topics':[{'name':'样例主题','examples':[
                {'corpus_id':1,'created_at':'2026-01-05','repository':'a/b','text':'real evidence','github_url':'https://github.com/a/b'},
                {'corpus_id':2,'created_at':'2026-02-05','repository':'a/b','text':'wrong month','github_url':'https://github.com/a/b'}]}]}
            return {'items':[{'corpus_id':1,'aspect':'ownership','sentiment':'negative','created_at':'2026-01-05'},
                             {'corpus_id':2,'aspect':'ownership','sentiment':'negative','created_at':'2026-02-05'}],'next_cursor':None}
        with patch('advice_service.get_json',side_effect=mock_get):
            c=build_context({'month':'2026-01','aspects':['ownership']})
        self.assertEqual(c['sources'][0]['data']['before_score'],-.4)
        self.assertEqual(c['sources'][0]['data']['current_score'],.2)
        self.assertEqual([s['id'] for s in c['sources']],['D0','D1','E1'])
        self.assertEqual(c['sources'][-1]['data']['labels'][0]['sentiment'],'negative')
    def test_job_reuses_validated_cache_and_never_caches_model_errors(self):
        with tempfile.TemporaryDirectory() as folder:
            store=Store(Path(folder)/'cache.sqlite');manager=Manager(store)
            selection={'month':'2026-01','aspects':['ownership'],'refresh':False}
            context={'month':'2026-01','previous_month':'2025-12','aspects':['所有权'],'sources':[], 'data_version':'v1','quarter_run':'run1'}
            manager.jobs['test']={'id':'test'}
            with patch('advice_service.build_context',return_value=context),patch('advice_service.call_glm',return_value={'summary':'result'}) as call:
                manager.run('test',selection);manager.run('test',selection)
                self.assertEqual(call.call_count,1);self.assertTrue(manager.get('test')['result']['cached'])
            selection['refresh']=True
            with patch('advice_service.build_context',return_value=context),patch('advice_service.call_glm',side_effect=AdviceError('GLM timeout')):
                manager.run('test',selection);self.assertEqual(manager.get('test')['status'],'error')

if __name__=='__main__':unittest.main()
