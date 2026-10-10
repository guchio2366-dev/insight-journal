/** Schematic name guides. Lines trace approximate axes, not mountain boundaries. */
export const europeTerrainGuides = [
  {name:'スカンディナヴィア山脈',coordinates:[13,65],line:[[6.5,60],[9,63],[14,65.5],[19,68]]},
  {name:'北ヨーロッパ平原',coordinates:[17,53],line:[[4,52],[10,53],[17,53],[24,52.5]]},
  {name:'ピレネー山脈',coordinates:[.6,42.7],line:[[-1.7,42.8],[.5,42.7],[3,42.6]]},
  {name:'アルプス山脈',coordinates:[10.7,46.5],line:[[5.8,44.5],[8,46],[10.5,46.7],[13,47],[15.7,46.5]]},
  {name:'カルパチア山脈',coordinates:[24.5,48.3],line:[[18,49.5],[21,49.2],[24,48.7],[26.5,47],[25,45.5]]},
  {name:'アペニン山脈',coordinates:[13.5,41.1],line:[[8,44.5],[11,43.2],[13.3,41.5],[16,39.3]]},
] as const;

export const europeTerrainPlaceNames = [
  {name:'イベリア半島',coordinates:[-5,39.5]},
  {name:'イタリア半島',coordinates:[12.5,40]},
  {name:'バルカン半島',coordinates:[23,40.5]},
  {name:'北海',coordinates:[2,57]},
  {name:'アドリア海',coordinates:[16.3,42.5]},
  {name:'地中海',coordinates:[5,36]},
  {name:'カスピ海',coordinates:[49,43]},
  {name:'シチリア島',coordinates:[14,37.4]},
] as const;
