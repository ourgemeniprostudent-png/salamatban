import { env } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export function getD1(): D1Database {
  if (!env.DB) throw new Error('D1 binding DB is unavailable.');
  return env.DB;
}

export function getDb() {
  return drizzle(getD1(), { schema });
}

/**
 * Production schema is owned exclusively by the versioned Drizzle migrations.
 * This compatibility entry point only inserts the small approved reference set
 * needed by the pilot and never creates or alters tables at request time.
 */
export async function ensureMvpSchema() {
  const db = getD1();
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO assistance_plans (id,title,duration_months,test_price_rial,is_active) VALUES ('assist-3','همراهی سه‌ماهه',3,0,1)"),
    db.prepare("INSERT OR IGNORE INTO assistance_plans (id,title,duration_months,test_price_rial,is_active) VALUES ('assist-6','همراهی شش‌ماهه',6,0,1)"),
    db.prepare("INSERT OR IGNORE INTO assistance_plans (id,title,duration_months,test_price_rial,is_active) VALUES ('assist-9','همراهی نه‌ماهه',9,0,1)"),
    db.prepare("INSERT OR IGNORE INTO assistance_plans (id,title,duration_months,test_price_rial,is_active) VALUES ('assist-12','همراهی دوازده‌ماهه',12,0,1)"),
    db.prepare("INSERT OR IGNORE INTO providers (id,name,city,service_label,adapter,is_active) VALUES ('provider-test-tehran','مرکز پایلوت تهران','تهران','چکاپ و نمونه‌گیری','local_test',1)"),
    db.prepare("INSERT OR IGNORE INTO providers (id,name,city,service_label,adapter,is_active) VALUES ('provider-test-shiraz','مرکز پایلوت شیراز','شیراز','آزمایش و مشاوره','local_test',1)"),
    db.prepare("INSERT OR IGNORE INTO providers (id,name,city,service_label,adapter,is_active) VALUES ('provider-manual-coordination','هماهنگی همیار','سراسری','ثبت درخواست و تماس هماهنگ‌کننده','manual_crm',1)"),
    db.prepare("INSERT OR IGNORE INTO providers (id,name,city,service_label,adapter,is_active) VALUES ('provider-doctoreto','دکترتو','سراسری','پزشک، مشاوره و نوبت','doctoreto',0)"),
    db.prepare("INSERT OR IGNORE INTO provider_integrations (id,provider_key,display_name,mode,status,payment_owner,is_enabled,updated_at) VALUES ('integration-local','local_test','مبدل داخلی پایلوت','test','ready','provider',1,0)"),
    db.prepare("INSERT OR IGNORE INTO provider_integrations (id,provider_key,display_name,mode,status,payment_owner,is_enabled,updated_at) VALUES ('integration-doctoreto','doctoreto','دکترتو','test','blocked','provider',0,0)"),
    db.prepare("INSERT OR IGNORE INTO provider_integrations (id,provider_key,display_name,mode,status,payment_owner,is_enabled,updated_at) VALUES ('integration-generic','generic_rest','ارائه‌دهنده REST جدید','test','draft','provider',0,0)"),
  ]);
}
