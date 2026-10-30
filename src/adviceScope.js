export function adviceRequest(selection,refresh=false){
  return {...(selection.month?{month:selection.month}:{start_date:selection.start,end_date:selection.end}),aspects:selection.ids,refresh};
}
export function adviceScopeLabel(scope){
  return scope.start_date?`${scope.start_date} — ${scope.end_date} · 区间分析`:`${scope.month} · 月度环比`;
}
