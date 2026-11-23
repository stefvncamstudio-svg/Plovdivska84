'use strict';
// Chain follows the citybound carriageway. The marked finish is the crossing by Д. Дебелянов.
const DragTrack=(()=>{
  const line=[[-126,-19.8],[-154.54,-22.78],[-195.98,-29.71],[-216.42,-33.12],
    [-246.4,-38.13],[-262.75,-40.87],[-276.47,-43.17],[-422.16,-68.19],
    [-438.73,-71.03],[-495.68,-80.81],[-504.12,-82.23],[-541.93,-88.67],
    [-558.04,-92.04],[-580.26,-97.81],[-595.67,-103.92],[-611.81,-111.99]];
  const length=[0];
  line.slice(1).forEach((p,i)=>length.push(length[i]+Math.hypot(p[0]-line[i][0],p[1]-line[i][1])));
  const finish=length[11], start=finish-402;
  function at(dist,lane=0){
    const along=Math.max(0,Math.min(length.at(-1),dist+start));
    let i=1;
    while(i<length.length-1&&length[i]<along)i++;
    const [a,b]=[line[i-1],line[i]], span=length[i]-length[i-1], t=(along-length[i-1])/span;
    const ux=(b[0]-a[0])/span,uz=(b[1]-a[1])/span, offset=lane===-1?0:lane===0?-1.54:1.54;
    return {x:a[0]+(b[0]-a[0])*t+uz*offset,z:a[1]+(b[1]-a[1])*t-ux*offset,yaw:Math.atan2(ux,uz)};
  }
  return {at};
})();
