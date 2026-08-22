(async function(){
  var tok = localStorage.getItem('lanpro_jwt_token');
  var raw = localStorage.getItem('lanpro_cache_selectedProject') || '{}';
  var obj = JSON.parse(raw); var pid = obj.id || (obj.data && obj.data.id);
  var r = await fetch('/api/projects/' + pid + '/documents', { headers: { Authorization: 'Bearer ' + tok } });
  var j = await r.json();
  var f = (j.data || []).filter(function(d){ return d.type === 'flowchart'; });
  return JSON.stringify({ pid: pid, status: r.status, jumlah: f.length,
    contoh: f[0] ? { desc: f[0].description, punyaCanvas: !!f[0].canvasData, panjang: (f[0].canvasData||'').length } : null });
})()
