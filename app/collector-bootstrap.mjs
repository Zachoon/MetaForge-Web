export async function claimCollectorBootstrap(DB,run){
  const claim=await DB.prepare("INSERT OR IGNORE INTO data_goblin_runs (id,game,status,sources_checked,sources_discovered) VALUES ('private-alpha-bootstrap','system','starting',0,0)").run();
  if(Number(claim.meta?.changes||0)!==1)return false;
  try{await run();await DB.prepare("UPDATE data_goblin_runs SET status='complete',finished_at=CURRENT_TIMESTAMP WHERE id='private-alpha-bootstrap'").run()}
  catch(error){await DB.prepare("UPDATE data_goblin_runs SET status='failed',finished_at=CURRENT_TIMESTAMP,error=? WHERE id='private-alpha-bootstrap'").bind(String(error).slice(0,500)).run()}
  return true;
}
