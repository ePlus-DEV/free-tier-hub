// Unified discovery projection with scoped identities.
// Legacy service counts/badges remain service-only; educational grants are
// separate offers, not an automatic lifetime public free-tier allowance.
export function educationSearchRows(services, education) {
  const seen=new Set(services.map(item=>item.id));
  if(seen.size!==services.length)throw Error('Duplicate service IDs in unified catalog');
  return education.map(item=>{
    const key='edu-'+item.id;
    if(seen.has(key))throw Error('Unified offer ID collision: '+key);
    seen.add(key);
    return [
      key,item.name,'education','education','unclassified','check','check',
      '',item.last_checked,
      [item.id,item.name,'education',item.audiences.join(' '),
        item.benefit_type,item.benefit,item.eligibility,item.restrictions].join(' ').toLowerCase()
    ];
  });
}
export function unifiedOfferStats(services,education) {
  const rows=educationSearchRows(services,education);
  return {
    service_offer_count:services.length,
    education_offer_count:rows.length,
    total_offers:services.length+rows.length,
    // Unique products require explicit product identity mapping; do not
    // dedupe by provider/display name or mislabel offers as distinct products.
    product_deduplication:'not_verified'
  };
}
