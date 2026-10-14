const selectors='[data-south-central-farm-connections],[data-west-farm-supply],[data-export-reading],[data-oceania-livestock-production]';
type Reference={node:HTMLElement;anchor:Comment;wrapper:HTMLDetailsElement};
const references=new WeakMap<ParentNode,Map<HTMLElement,Reference>>();

/** Keep older regional/year references available without competing with the
 * selected national flow. Original nodes, listeners and placement are retained. */
export function syncAgroRegionalReferences(root:ParentNode,selectedCountry:boolean){
 let saved=references.get(root);if(!saved){saved=new Map();references.set(root,saved);}
 for(const node of root.querySelectorAll<HTMLElement>(selectors)){
  const existing=saved.get(node);
  const collapse=selectedCountry&&!node.hidden;
  if(!collapse){
   if(existing){existing.anchor.parentNode?.insertBefore(node,existing.anchor);existing.wrapper.remove();existing.anchor.remove();saved.delete(node);}
   continue;
  }
  if(existing||!node.parentNode)continue;
  const wrapper=node.ownerDocument.createElement('details'),summary=node.ownerDocument.createElement('summary'),anchor=node.ownerDocument.createComment('regional reference position');
  wrapper.className='agro-existing-regional-reference';summary.textContent='別年・範囲の参考';wrapper.append(summary);
  node.before(anchor,wrapper);wrapper.append(node);saved.set(node,{node,anchor,wrapper});
 }
}
