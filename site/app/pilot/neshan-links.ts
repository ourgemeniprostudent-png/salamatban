/** Official Neshan point URL. With no real origin this opens a point, not a
 * fabricated route or a promise of nearby/available emergency care.
 */
export function neshanPointUrl(latitude:number,longitude:number):string {
 if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>90||Math.abs(longitude)>180)throw new RangeError('Invalid map point');
 return `https://nshn.ir/?${new URLSearchParams({lat:String(latitude),lng:String(longitude)})}`;
}
