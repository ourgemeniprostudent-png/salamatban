import { PilotError, text } from './domain';
export type BookingLocation={address:string;unit:string;entrance:string;latitude:number|null;longitude:number|null;confirmed:boolean};
export function cleanLocation(value:unknown):BookingLocation {
 if(!value||typeof value!=='object')throw new PilotError('INVALID_LOCATION',422);
 const v=value as Record<string,unknown>,address=text(v.address,500),unit=text(v.unit,80),entrance=text(v.entrance,200),latitude=v.latitude??null,longitude=v.longitude??null;
 if(address.length<5||v.confirmed!==true)throw new PilotError('LOCATION_CONFIRMATION_REQUIRED',422);
 if((latitude===null)!==(longitude===null)||latitude!==null&&(typeof latitude!=='number'||!Number.isFinite(latitude)||latitude< -90||latitude>90||typeof longitude!=='number'||!Number.isFinite(longitude)||longitude< -180||longitude>180))throw new PilotError('INVALID_LOCATION',422);
 return {address,unit,entrance,latitude:latitude as number|null,longitude:longitude as number|null,confirmed:true};
}
