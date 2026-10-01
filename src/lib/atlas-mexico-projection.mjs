// INEGI .prj: ITRF92, GRS80, Lambert Conformal Conic (2 standard parallels).
export const mexicoProjection = Object.freeze({
  name:'INEGI Lambert Conformal Conic', datum:'ITRF92', ellipsoid:'GRS80',
  semiMajorM:6378137, inverseFlattening:298.257222101,
  standardParallel1:17.5, standardParallel2:29.5, latitudeOrigin:12,
  centralMeridian:-102, falseEastingM:2500000, falseNorthingM:0,
});
const rad=Math.PI/180;
const p=mexicoProjection, f=1/p.inverseFlattening, e=Math.sqrt(2*f-f*f);
const m=phi=>Math.cos(phi)/Math.sqrt(1-e*e*Math.sin(phi)**2);
const t=phi=>Math.tan(Math.PI/4-phi/2)/((1-e*Math.sin(phi))/(1+e*Math.sin(phi)))**(e/2);
const phi1=p.standardParallel1*rad,phi2=p.standardParallel2*rad;
const n=(Math.log(m(phi1))-Math.log(m(phi2)))/(Math.log(t(phi1))-Math.log(t(phi2)));
const F=m(phi1)/(n*t(phi1)**n),rho0=p.semiMajorM*F*t(p.latitudeOrigin*rad)**n;
export function lambertForward([longitude,latitude]) {
  if(!Number.isFinite(longitude)||!Number.isFinite(latitude)||Math.abs(latitude)>=90)throw new RangeError('Invalid geographic coordinate');
  const rho=p.semiMajorM*F*t(latitude*rad)**n,theta=n*(longitude-p.centralMeridian)*rad;
  return [p.falseEastingM+rho*Math.sin(theta),p.falseNorthingM+rho0-rho*Math.cos(theta)];
}
export function lambertInverse([x,y]) {
  const dx=x-p.falseEastingM,dy=rho0-(y-p.falseNorthingM),rho=Math.hypot(dx,dy);
  const theta=Math.atan2(dx,dy),tt=(rho/(p.semiMajorM*F))**(1/n);
  let phi=Math.PI/2-2*Math.atan(tt);
  for(let i=0;i<15;i++) {
    const next=Math.PI/2-2*Math.atan(tt*((1-e*Math.sin(phi))/(1+e*Math.sin(phi)))**(e/2));
    if(Math.abs(next-phi)<1e-13){phi=next;break;}phi=next;
  }
  return [p.centralMeridian+theta/n/rad,phi/rad];
}
