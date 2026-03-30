const HOLIDAY_DATA = { 2025: { 1: 6, 2: 7, 3: 3, 4: 2 }, 2026: { 1: 5, 2: 8, 3: 2, 4: 2 }, 2027: { 1: 7, 2: 5, 3: 3, 4: 2 } };
let initiatives = [
    { id: 1, name: "Analytics Dashboard", rank: 1, be: 12, fe: 8, qa: 4, cat: "Product" },
    { id: 2, name: "Smart Checkout v2", rank: 2, be: 6, fe: 10, qa: 5, cat: "Product" },
    { id: 3, name: "Loyalty Rewards", rank: 3, be: 10, fe: 4, qa: 3, cat: "Product" },
    { id: 4, name: "Database Migration", rank: 1, be: 20, fe: 1, qa: 6, cat: "Engineering" },
    { id: 5, name: "Security Hardening", rank: 2, be: 8, fe: 2, qa: 4, cat: "Engineering" }
];

let lastCalculatedComboIds = [];
let editingId = null;

function autoSetHolidays() {
    const y = document.getElementById('config-year').value, q = document.getElementById('config-quarter').value;
    if (HOLIDAY_DATA[y] && HOLIDAY_DATA[y][q]) document.getElementById('config-holidays').value = HOLIDAY_DATA[y][q];
}

function syncLimits() {
    const hBE = parseInt(document.getElementById('be-headcount').value) || 1;
    const hFE = parseInt(document.getElementById('fe-headcount').value) || 1;
    const hQA = parseInt(document.getElementById('qa-headcount').value) || 1;
    ['be','fe','qa'].forEach(rk => {
        const el = document.getElementById(`limit-${rk}`);
        const head = (rk === 'be') ? hBE : (rk === 'fe' ? hFE : hQA);
        if (parseInt(el.value) > head) el.value = head;
        el.max = head;
    });
}

function updateDashboard() {
    const holidays = parseInt(document.getElementById('config-holidays').value) || 0;
    const billingDays = 91 - (Math.floor(91/7)*2) - holidays - 4.5;
    document.getElementById('label-net-days').innerText = `Billing Days: ${billingDays.toFixed(1)}`;
    
    const tCap = { 
        BE: (parseInt(document.getElementById('be-headcount').value) * billingDays) / 5,
        FE: (parseInt(document.getElementById('fe-headcount').value) * billingDays) / 5,
        QA: (parseInt(document.getElementById('qa-headcount').value) * billingDays) / 5
    };
    const split = parseFloat(document.getElementById('split-ratio').value);
    
    renderInitiativeList();
    const results = simulateTimeline(tCap, split);
    renderUtilization(tCap, split, results);
    renderRecommendations(tCap, billingDays, split);
}

function renderInitiativeList() {
    const container = document.getElementById('initiative-list');
    container.innerHTML = '';
    [...initiatives].sort((a, b) => (a.cat === b.cat ? a.rank - b.rank : (a.cat === 'Product' ? -1 : 1))).forEach(i => {
        const item = document.createElement('div');
        item.className = 'initiative-card bg-white border border-slate-100 p-3 rounded-xl flex justify-between items-center text-xs group hover:border-slate-200 transition cursor-default shadow-sm';
        item.innerHTML = `
            <div class="overflow-hidden">
                <div class="font-bold flex items-center gap-1.5 truncate text-slate-800">
                    <span class="w-1.5 h-1.5 rounded-full ${i.cat == 'Product' ? 'bg-blue-400' : 'bg-purple-400'}"></span> ${i.name}
                </div>
                <div class="text-[9px] text-slate-400 mt-1 font-black uppercase tracking-tighter flex gap-2">
                    <span>#${i.rank}</span> 
                    <span>B:${i.be}</span> <span>F:${i.fe}</span> <span>Q:${i.qa}</span>
                </div>
            </div>
            <div class="actions flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onclick="editInitiative(${i.id})" class="text-slate-400 hover:text-blue-500 font-bold text-lg">✎</button>
                <button onclick="deleteInitiative(${i.id})" class="text-slate-400 hover:text-red-500 font-bold text-lg">✕</button>
            </div>`;
        container.appendChild(item);
    });
}

function renderUtilization(total, split, alloc) {
    const container = document.getElementById('allocation-breakdown'); container.innerHTML = '';
    const sprints = 6.5;
    ['BE', 'FE', 'QA'].forEach(r => {
        const pA = total[r] * split, eA = total[r] * (1-split);
        container.innerHTML += `
            <tr class="hover:bg-slate-50 transition text-center text-xs">
                <td class="p-4 font-black text-left uppercase text-[10px] border-r tracking-widest">${r}</td>
                <td class="p-4 border-r"><b>${total[r].toFixed(1)}</b><div class="text-[9px] text-slate-400">${(total[r]/sprints).toFixed(1)} / Sprint</div></td>
                <td class="p-4 border-r">
                    <div class="flex justify-between mb-1 text-[10px] font-black ${alloc.prod[r] > pA ? 'text-red-600' : 'text-blue-600'}">
                        <span>${alloc.prod[r].toFixed(1)} / ${pA.toFixed(1)}</span>
                    </div>
                    <div class="capacity-bar"><div class="capacity-fill ${alloc.prod[r] > pA ? 'bg-red-500' : 'bg-blue-500'}" style="width: ${Math.min((alloc.prod[r]/pA)*100, 100)}%"></div></div>
                </td>
                <td class="p-4">
                    <div class="flex justify-between mb-1 text-[10px] font-black ${alloc.eng[r] > eA ? 'text-red-600' : 'text-purple-600'}">
                        <span>${alloc.eng[r].toFixed(1)} / ${eA.toFixed(1)}</span>
                    </div>
                    <div class="capacity-bar"><div class="capacity-fill ${alloc.eng[r] > eA ? 'bg-red-500' : 'bg-purple-500'}" style="width: ${Math.min((alloc.eng[r]/eA)*100, 100)}%"></div></div>
                </td>
            </tr>`;
    });
}

function renderRecommendations(totalCap, billingDays, split) {
    const hcDiv = document.getElementById('recommended-hc'), comboDiv = document.getElementById('recommended-combo');
    hcDiv.innerHTML = ''; comboDiv.innerHTML = '';
    const mwPerHC = billingDays / 5;
    
    ['BE', 'FE', 'QA'].forEach(role => {
        const rk = role.toLowerCase();
        const dP = initiatives.filter(i => i.cat === 'Product').reduce((s, i) => s + i[rk], 0);
        const dE = initiatives.filter(i => i.cat === 'Engineering').reduce((s, i) => s + i[rk], 0);
        let needed = (split >= 1) ? dP : (split <= 0) ? dE : Math.max(dP / split, dE / (1 - split));
        const ideal = Math.ceil(needed / mwPerHC);
        const current = parseInt(document.getElementById(`${rk}-headcount`).value);
        const diff = ideal - current;
        hcDiv.innerHTML += `<div class="flex justify-between items-center bg-slate-700/50 p-3 rounded-2xl border border-slate-600"><span class="font-black text-xs uppercase tracking-widest text-slate-300 text-center">${role}</span><div class="text-right"><div class="text-lg font-black text-white leading-none">${ideal} <span class="text-[10px] text-slate-400">HC</span></div><div class="text-[10px] ${diff > 0 ? 'text-orange-400' : 'text-green-400'} font-bold mt-1">${diff > 0 ? '+'+diff+' needed' : 'Optimized'}</div></div></div>`;
    });

    lastCalculatedComboIds = [];
    const sortedInits = [...initiatives].sort((a,b) => (a.cat === b.cat ? a.rank - b.rank : (a.cat==='Product'?-1:1)));
    const fullSim = runRawSimulation(sortedInits, totalCap, split);
    
    fullSim.forEach(res => {
        if (res.allDone) {
            lastCalculatedComboIds.push(res.id);
            const orig = initiatives.find(o => o.id === res.id);
            const catClass = orig.cat === 'Product' ? 'bg-blue-800/50 text-blue-100' : 'bg-purple-800/50 text-purple-100';
            comboDiv.innerHTML += `<div class="flex items-center justify-between p-2.5 rounded-xl bg-white/10 border border-white/10 group"><span class="truncate font-bold text-white text-xs">${orig.name}</span> <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded ${catClass}">${orig.cat}</span></div>`;
        }
    });

    if (!lastCalculatedComboIds.length) comboDiv.innerHTML = "<div class='text-blue-100/50 text-center py-4 text-xs font-bold uppercase'>Capacity fully exhausted.</div>";
}

function applyRecommendedCombo() {
    if (!lastCalculatedComboIds.length) return;
    initiatives = initiatives.filter(i => lastCalculatedComboIds.includes(i.id));
    document.getElementById('reset-tip').classList.remove('hidden');
    updateDashboard();
}

function runRawSimulation(batch, total, split) {
    const numSprints = 6.5;
    const cap = { 
        Product: { BE: (total.BE * split)/numSprints, FE: (total.FE * split)/numSprints, QA: (total.QA * split)/numSprints }, 
        Engineering: { BE: (total.BE * (1-split))/numSprints, FE: (total.FE * (1-split))/numSprints, QA: (total.QA * (1-split))/numSprints } 
    };
    const lLimit = { 
        BE: parseInt(document.getElementById('limit-be').value)*2, 
        FE: parseInt(document.getElementById('limit-fe').value)*2, 
        QA: parseInt(document.getElementById('limit-qa').value)*2 
    };
    
    const buffer = 0.4;
    let work = batch.map(i => ({ ...i, remBE: i.be, remFE: i.fe, remQA: i.qa, timeline: Array(6).fill(''), used: {BE:0, FE:0, QA:0}, started: false }));

    for (let s = 0; s < 6; s++) {
        let usage = { Product: { BE: 0, FE: 0, QA: 0 }, Engineering: { BE: 0, FE: 0, QA: 0 } };
        work.forEach(i => {
            let p = usage[i.cat], lim = cap[i.cat], log = '';
            if (i.remBE > 0.001) { 
                let t = Math.min(i.remBE, lim.BE - p.BE, lLimit.BE); 
                if (t > 0.001) { i.remBE -= t; p.BE += t; i.used.BE += t; log += `BE:${t.toFixed(1)};`; i.started = true; } 
            }
            if (i.remFE > 0.001) { 
                let t = Math.min(i.remFE, lim.FE - p.FE, lLimit.FE); 
                if (i.remFE - t <= buffer + 0.001 && i.remBE > 0.001) t = Math.max(0, i.remFE - buffer);
                if (t > 0.001) { i.remFE -= t; p.FE += t; i.used.FE += t; log += `FE:${t.toFixed(1)};`; i.started = true; } 
            }
            i.timeline[s] += log;
        });
        work.forEach(i => {
            let p = usage[i.cat], lim = cap[i.cat];
            const isBusy = i.timeline[s].includes('BE:') || i.timeline[s].includes('FE:');
            if (i.remBE < 0.001 && i.remFE < 0.001 && !isBusy && i.remQA > 0.001) {
                let t = Math.min(i.remQA, lim.QA - p.QA, lLimit.QA);
                if (t > 0.001) { i.remQA -= t; p.QA += t; i.used.QA += t; i.timeline[s] += `QA:${t.toFixed(1)};`; i.started = true; }
            }
        });
    }
    return work.map(w => ({ ...w, allDone: (w.remBE + w.remFE + w.remQA < 0.01) }));
}

function simulateTimeline(total, split) {
    const pRows = document.getElementById('product-rows'), eRows = document.getElementById('engineering-rows');
    const lists = { completed: document.getElementById('list-completed'), dev: document.getElementById('list-dev-done'), carried: document.getElementById('list-carried'), unable: document.getElementById('list-unable') };
    Object.values(lists).forEach(l => l.innerHTML = ''); pRows.innerHTML = ''; eRows.innerHTML = '';
    
    const results = runRawSimulation(initiatives, total, split);
    let poolTotals = { prod: { BE: 0, FE: 0, QA: 0 }, eng: { BE: 0, FE: 0, QA: 0 } };

    results.forEach(i => {
        const target = i.cat === 'Product' ? pRows : eRows;
        if (i.timeline.some(t => t !== '')) {
            let row = `<div class="gantt-cell border-r font-bold flex flex-col justify-center bg-slate-50/10 truncate">
                <span class="truncate leading-tight text-slate-800 font-bold">${i.name}</span>
                <div class="flex flex-wrap gap-x-2 mt-0.5 font-black uppercase text-[8px]">
                    <span class="text-slate-400">#${i.rank}</span><span class="text-green-600">B:${i.be}</span><span class="text-yellow-600">F:${i.fe}</span><span class="text-blue-500">Q:${i.qa}</span>
                </div>
            </div>`;
            i.timeline.forEach(c => {
                const cellMarkup = c.split(';').filter(x => x).map(entry => {
                    const [type, val] = entry.split(':');
                    const cls = type === 'BE' ? 'bg-green-100 text-green-800' : type === 'FE' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800';
                    return `<div class="${cls} px-1 py-0.5 rounded text-[10px] font-bold mb-0.5">${type}: ${val}</div>`;
                }).join('');
                row += `<div class="gantt-cell border-r flex flex-col justify-center border-slate-50">${cellMarkup}</div>`;
            });
            target.innerHTML += row;
        }
        const k = i.cat === 'Product' ? 'prod' : 'eng';
        poolTotals[k].BE += i.used.BE; poolTotals[k].FE += i.used.FE; poolTotals[k].QA += i.used.QA;
        
        const label = `<li class="truncate px-2">• ${i.name}</li>`;
        if (!i.started) lists.unable.innerHTML += label; 
        else if (i.allDone) lists.completed.innerHTML += label; 
        else if (i.remBE + i.remFE < 0.01) lists.dev.innerHTML += label; 
        else lists.carried.innerHTML += label;
    });
    return poolTotals;
}

function reorderRanks(cat, newRank, ignoreId = null) { initiatives.forEach(i => { if (i.cat === cat && i.rank >= newRank && i.id !== ignoreId) i.rank += 1; }); }
function openModal() { editingId = null; document.getElementById('modal-title').innerText = 'New Initiative'; document.getElementById('new-name').value = ''; document.getElementById('modal').style.display='flex'; }
function closeModal() { document.getElementById('modal').style.display='none'; }
function openBulkModal() { 
    document.getElementById('bulk-input').value = initiatives.sort((a,b) => (a.cat === b.cat ? a.rank - b.rank : (a.cat==='Product'?-1:1))).map(i => `${i.name}\t${i.cat}\t${i.rank}\t${i.be}\t${i.fe}\t${i.qa}`).join('\n'); 
    document.getElementById('bulk-modal').style.display='flex'; 
}
function closeBulkModal() { document.getElementById('bulk-modal').style.display='none'; }

function processBulkImport() {
    const raw = document.getElementById('bulk-input').value.trim();
    if (!raw) { initiatives = []; updateDashboard(); closeBulkModal(); return; }
    initiatives = raw.split('\n').filter(l => l.trim()).map(line => {
        const p = line.split('\t');
        return { id: Math.random(), name: (p[0]||'Task').trim(), cat: (p[1]||'Product').trim(), rank: parseInt(p[2]) || 1, be: parseFloat(p[3]) || 0, fe: parseFloat(p[4]) || 0, qa: parseFloat(p[5]) || 0 };
    });
    document.getElementById('reset-tip').classList.add('hidden');
    updateDashboard(); closeBulkModal();
}

function editInitiative(id) {
    editingId = id; const i = initiatives.find(x => x.id === id);
    document.getElementById('modal-title').innerText = 'Modify Initiative';
    document.getElementById('new-name').value = i.name; document.getElementById('new-cat').value = i.cat;
    document.getElementById('new-rank').value = i.rank; document.getElementById('new-be').value = i.be;
    document.getElementById('new-fe').value = i.fe; document.getElementById('new-qa').value = i.qa;
    document.getElementById('modal').style.display = 'flex';
}
function deleteInitiative(id) { initiatives = initiatives.filter(x => x.id !== id); updateDashboard(); }
function saveInitiative() {
    const cat = document.getElementById('new-cat').value, rank = parseInt(document.getElementById('new-rank').value);
    const data = { name: document.getElementById('new-name').value || "Project", cat, rank, be: parseFloat(document.getElementById('new-be').value) || 0, fe: parseFloat(document.getElementById('new-fe').value) || 0, qa: parseFloat(document.getElementById('new-qa').value) || 0 };
    if (editingId) {
        const idx = initiatives.findIndex(x => x.id === editingId);
        if (initiatives[idx].rank !== rank || initiatives[idx].cat !== cat) initiatives.forEach(i => { if (i.cat === cat && i.rank >= rank && i.id !== editingId) i.rank += 1; });
        initiatives[idx] = { ...initiatives[idx], ...data };
    } else { initiatives.forEach(i => { if (i.cat === cat && i.rank >= rank) i.rank += 1; }); initiatives.push({ id: Date.now(), ...data }); }
    updateDashboard(); closeModal();
}

window.onload = () => { autoSetHolidays(); syncLimits(); updateDashboard(); };
