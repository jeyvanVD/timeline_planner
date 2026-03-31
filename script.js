const HOLIDAY_DATA = { 2025: { 1: 6, 2: 7, 3: 3, 4: 2 }, 2026: { 1: 5, 2: 8, 3: 2, 4: 2 }, 2027: { 1: 7, 2: 5, 3: 3, 4: 2 } };

let customFunctions = [
    { id: 'be', label: 'BE', color: 'green', limit: 2, headcount: 8 },
    { id: 'fe', label: 'FE', color: 'yellow', limit: 2, headcount: 4 },
    { id: 'qa', label: 'QA', color: 'blue', limit: 2, headcount: 4 }
];

const availableColors = ['green', 'yellow', 'blue', 'purple', 'red', 'orange', 'teal', 'pink', 'indigo'];
const colorClasses = {
    'green': { bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-400', fill: 'bg-green-500', barText: 'text-green-600' },
    'yellow': { bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-400', fill: 'bg-yellow-500', barText: 'text-yellow-600' },
    'blue': { bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-400', fill: 'bg-blue-500', barText: 'text-blue-600' },
    'purple': { bg: 'bg-purple-100', text: 'text-purple-800', dot: 'bg-purple-400', fill: 'bg-purple-500', barText: 'text-purple-600' },
    'red': { bg: 'bg-red-100', text: 'text-red-800', dot: 'bg-red-400', fill: 'bg-red-500', barText: 'text-red-600' },
    'orange': { bg: 'bg-orange-100', text: 'text-orange-800', dot: 'bg-orange-400', fill: 'bg-orange-500', barText: 'text-orange-600' },
    'teal': { bg: 'bg-teal-100', text: 'text-teal-800', dot: 'bg-teal-400', fill: 'bg-teal-500', barText: 'text-teal-600' },
    'pink': { bg: 'bg-pink-100', text: 'text-pink-800', dot: 'bg-pink-400', fill: 'bg-pink-500', barText: 'text-pink-600' },
    'indigo': { bg: 'bg-indigo-100', text: 'text-indigo-800', dot: 'bg-indigo-400', fill: 'bg-indigo-500', barText: 'text-indigo-600' }
};

let initiatives = [
    { id: 1, name: "Analytics Dashboard", rank: 1, be: 12, fe: 8, qa: 4, cat: "Product" },
    { id: 2, name: "Smart Checkout v2", rank: 2, be: 6, fe: 10, qa: 5, cat: "Product" },
    { id: 3, name: "Loyalty Rewards", rank: 3, be: 10, fe: 4, qa: 3, cat: "Product" },
    { id: 4, name: "Database Migration", rank: 1, be: 20, fe: 1, qa: 6, cat: "Engineering" },
    { id: 5, name: "Security Hardening", rank: 2, be: 8, fe: 2, qa: 4, cat: "Engineering" }
];

let lastCalculatedComboIds = [];
let editingId = null;

function renderDynamicInputs() {
    // Resource Pool List
    const resourcePool = document.getElementById('resource-pool-list');
    resourcePool.innerHTML = customFunctions.map(f => `
        <div class="flex items-center justify-between text-slate-600">
            <span>${f.label} Count</span>
            <input type="number" id="hc-${f.id}" value="${f.headcount}" class="w-16 px-2 py-1 border rounded-lg text-right font-bold" onchange="syncLimits(); updateDashboard();">
        </div>
    `).join('');

    // Initiative HC Limits List
    const limitsList = document.getElementById('initiative-limits-list');
    limitsList.innerHTML = customFunctions.map(f => `
        <div class="flex items-center justify-between">
            <span>Max ${f.label} / Proj</span>
            <input type="number" id="limit-${f.id}" value="${f.limit}" class="w-12 px-2 py-1 border rounded text-right font-semibold" onchange="syncLimits(); updateDashboard()">
        </div>
    `).join('');

    // Modal Inputs
    const modalInputs = document.getElementById('modal-function-inputs');
    modalInputs.innerHTML = customFunctions.map(f => `
        <div>
            <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">${f.label} MW</label>
            <input id="new-${f.id}" type="number" step="0.1" class="w-full p-2 border rounded-xl text-center font-bold text-slate-900">
        </div>
    `).join('');

    // Product Section Legend
    const legend = document.getElementById('product-legend');
    if(legend) {
        legend.innerHTML = customFunctions.map(f => `
            <span class="flex items-center gap-1"><span class="w-2 h-2 ${colorClasses[f.color].dot} rounded-full"></span> ${f.label}</span>
        `).join('');
    }
}

function autoSetHolidays() {
    const y = document.getElementById('config-year').value, q = document.getElementById('config-quarter').value;
    if (HOLIDAY_DATA[y] && HOLIDAY_DATA[y][q]) document.getElementById('config-holidays').value = HOLIDAY_DATA[y][q];
}

function syncLimits() {
    customFunctions.forEach(f => {
        const hcEl = document.getElementById(`hc-${f.id}`);
        const limitEl = document.getElementById(`limit-${f.id}`);
        if(hcEl && limitEl) {
            const head = parseInt(hcEl.value) || 1;
            if (parseInt(limitEl.value) > head) limitEl.value = head;
            limitEl.max = head;
            f.headcount = head;
            f.limit = parseInt(limitEl.value);
        }
    });
}

function updateDashboard() {
    const holidays = parseInt(document.getElementById('config-holidays').value) || 0;
    const billingDays = 91 - (Math.floor(91/7)*2) - holidays - 4.5;
    document.getElementById('label-net-days').innerText = `Billing Days: ${billingDays.toFixed(1)}`;
    
    const tCap = {};
    customFunctions.forEach(f => {
        const hc = parseInt(document.getElementById(`hc-${f.id}`).value) || 0;
        tCap[f.id] = (hc * billingDays) / 5;
    });
    
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
        
        const statsStr = customFunctions.map(f => `<span>${f.label.charAt(0)}:${i[f.id]||0}</span>`).join(' ');
        
        item.innerHTML = `
            <div class="overflow-hidden">
                <div class="font-bold flex items-center gap-1.5 truncate text-slate-800">
                    <span class="w-1.5 h-1.5 rounded-full ${i.cat == 'Product' ? 'bg-blue-400' : 'bg-purple-400'}"></span> ${i.name}
                </div>
                <div class="text-[9px] text-slate-400 mt-1 font-black uppercase tracking-tighter flex gap-2">
                    <span>#${i.rank}</span> 
                    ${statsStr}
                </div>
            </div>
            <div class="actions flex gap-1 opacity-0 group-hover:opacity-100 transition">
                <button onclick="editInitiative(${i.id})" class="text-slate-400 hover:text-blue-500 font-bold text-lg">✎</button>
                <button onclick="deleteInitiative(${i.id})" class="text-slate-400 hover:text-red-500 font-bold text-lg">✕</button>
            </div>`;
        container.appendChild(item);
    });
}

function renderUtilization(totalCap, split, alloc) {
    const container = document.getElementById('allocation-breakdown'); container.innerHTML = '';
    const sprints = 6.5;
    customFunctions.forEach(f => {
        const r = f.id;
        const pA = totalCap[r] * split, eA = totalCap[r] * (1-split);
        const prodColor = alloc.prod[r] > pA ? 'red' : 'blue';
        const engColor = alloc.eng[r] > eA ? 'red' : 'purple';
        
        container.innerHTML += `
            <tr class="hover:bg-slate-50 transition text-center text-xs">
                <td class="p-4 font-black text-left uppercase text-[10px] border-r tracking-widest">${f.label}</td>
                <td class="p-4 border-r"><b>${totalCap[r].toFixed(1)}</b><div class="text-[9px] text-slate-400">${(totalCap[r]/sprints).toFixed(1)} / Sprint</div></td>
                <td class="p-4 border-r">
                    <div class="flex justify-between items-end mb-1 text-[10px] font-black text-${prodColor}-600">
                        <span>${alloc.prod[r].toFixed(1)} / ${pA.toFixed(1)}</span>
                        <span class="font-bold text-[8px] opacity-70">(${(pA/sprints).toFixed(1)}/Sprint)</span>
                    </div>
                    <div class="capacity-bar"><div class="capacity-fill bg-${prodColor}-500" style="width: ${Math.min((alloc.prod[r]/pA)*100, 100)}%"></div></div>
                </td>
                <td class="p-4">
                    <div class="flex justify-between items-end mb-1 text-[10px] font-black text-${engColor}-600">
                        <span>${alloc.eng[r].toFixed(1)} / ${eA.toFixed(1)}</span>
                        <span class="font-bold text-[8px] opacity-70">(${(eA/sprints).toFixed(1)}/Sprint)</span>
                    </div>
                    <div class="capacity-bar"><div class="capacity-fill bg-${engColor}-500" style="width: ${Math.min((alloc.eng[r]/eA)*100, 100)}%"></div></div>
                </td>
            </tr>`;
    });
}

function renderRecommendations(totalCap, billingDays, split) {
    const hcDiv = document.getElementById('recommended-hc'), comboDiv = document.getElementById('recommended-combo');
    hcDiv.innerHTML = ''; comboDiv.innerHTML = '';
    const mwPerHC = billingDays / 5;
    
    customFunctions.forEach(f => {
        const rk = f.id;
        const dP = initiatives.filter(i => i.cat === 'Product').reduce((s, i) => s + (i[rk]||0), 0);
        const dE = initiatives.filter(i => i.cat === 'Engineering').reduce((s, i) => s + (i[rk]||0), 0);
        let needed = (split >= 1) ? dP : (split <= 0) ? dE : Math.max(dP / split, dE / (1 - split));
        const ideal = Math.ceil(needed / mwPerHC);
        const current = parseInt(document.getElementById(`hc-${rk}`).value) || 0;
        const diff = ideal - current;
        hcDiv.innerHTML += `<div class="flex justify-between items-center bg-slate-700/50 p-3 rounded-2xl border border-slate-600"><span class="font-black text-xs uppercase tracking-widest text-slate-300 text-center">${f.label}</span><div class="text-right"><div class="text-lg font-black text-white leading-none">${ideal} <span class="text-[10px] text-slate-400">HC</span></div><div class="text-[10px] ${diff > 0 ? 'text-orange-400' : 'text-green-400'} font-bold mt-1">${diff > 0 ? '+'+diff+' needed' : 'Optimized'}</div></div></div>`;
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

function runRawSimulation(batch, totalCap, split) {
    const numSprints = 6.5;
    const cap = { Product: {}, Engineering: {} };
    const lLimit = {};
    customFunctions.forEach(f => {
        cap.Product[f.id] = (totalCap[f.id] * split) / numSprints;
        cap.Engineering[f.id] = (totalCap[f.id] * (1 - split)) / numSprints;
        const limEl = document.getElementById(`limit-${f.id}`);
        lLimit[f.id] = limEl ? parseInt(limEl.value) * 2 : f.limit * 2;
    });
    
    let work = batch.map(i => {
        let n = { ...i, timeline: Array(6).fill(''), started: false, used: {} };
        customFunctions.forEach(f => {
            n[`rem_${f.id}`] = i[f.id] || 0;
            n.used[f.id] = 0;
        });
        return n;
    });

    for (let s = 0; s < 6; s++) {
        let usage = { Product: {}, Engineering: {} };
        customFunctions.forEach(f => { usage.Product[f.id] = 0; usage.Engineering[f.id] = 0; });
        
        // Pass 1: Run all functions EXCEPT QA
        work.forEach(i => {
            let p = usage[i.cat], lim = cap[i.cat], log = '';
            
            customFunctions.forEach(f => {
                if (f.id === 'qa') return;
                let rem = i[`rem_${f.id}`];
                if (rem > 0.001) {
                    let t = Math.min(rem, lim[f.id] - p[f.id], lLimit[f.id]);
                    if (t > 0.001) {
                        i[`rem_${f.id}`] -= t;
                        p[f.id] += t;
                        i.used[f.id] += t;
                        log += `${f.id}:${t.toFixed(1)};`; 
                        i.started = true;
                    }
                }
            });
            i.timeline[s] += log;
        });

        // Pass 2: Run QA only if all other functions are depleted and not active this sprint
        work.forEach(i => {
            let p = usage[i.cat], lim = cap[i.cat];
            let qaFunc = customFunctions.find(f => f.id === 'qa');
            if (qaFunc && i[`rem_qa`] > 0.001) {
                let nonQARem = 0;
                let isBusy = false;
                customFunctions.forEach(f => {
                    if (f.id !== 'qa') {
                        nonQARem += i[`rem_${f.id}`];
                        if (i.timeline[s].includes(`${f.id}:`)) isBusy = true;
                    }
                });

                if (nonQARem < 0.001 && !isBusy) {
                    let t = Math.min(i[`rem_qa`], lim.qa - p.qa, lLimit.qa);
                    if (t > 0.001) {
                        i[`rem_qa`] -= t;
                        p.qa += t;
                        i.used.qa += t;
                        i.timeline[s] += `qa:${t.toFixed(1)};`;
                        i.started = true;
                    }
                }
            }
        });
    }
    return work.map(w => {
        let sumRem = 0;
        customFunctions.forEach(f => { sumRem += w[`rem_${f.id}`]; });
        return { ...w, allDone: (sumRem < 0.01) };
    });
}

function simulateTimeline(totalCap, split) {
    const pRows = document.getElementById('product-rows'), eRows = document.getElementById('engineering-rows');
    const lists = { completed: document.getElementById('list-completed'), dev: document.getElementById('list-dev-done'), carried: document.getElementById('list-carried'), unable: document.getElementById('list-unable') };
    Object.values(lists).forEach(l => l.innerHTML = ''); pRows.innerHTML = ''; eRows.innerHTML = '';
    
    const sortedInits = [...initiatives].sort((a,b) => (a.cat === b.cat ? a.rank - b.rank : (a.cat==='Product'?-1:1)));
    const results = runRawSimulation(sortedInits, totalCap, split);
    let poolTotals = { prod: {}, eng: {} };
    customFunctions.forEach(f => { poolTotals.prod[f.id] = 0; poolTotals.eng[f.id] = 0; });

    results.forEach(i => {
        const target = i.cat === 'Product' ? pRows : eRows;
        if (i.timeline.some(t => t !== '')) {
            const statsStr = customFunctions.map(f => `<span class="${colorClasses[f.color].barText}">${f.label.charAt(0)}:${i[f.id]||0}</span>`).join('');
            
            let row = `<div class="gantt-cell border-r font-bold flex flex-col justify-center bg-slate-50/10 truncate">
                <span class="truncate leading-tight text-slate-800 font-bold"><span class="text-slate-400 font-black tracking-tighter mr-1 w-5 inline-block">#${i.rank}</span>${i.name}</span>
                <div class="flex flex-wrap gap-x-2 mt-0.5 font-black uppercase text-[8px] pl-6">
                    ${statsStr}
                </div>
            </div>`;
            
            i.timeline.forEach(c => {
                const cellMarkup = c.split(';').filter(x => x).map(entry => {
                    const [fid, val] = entry.split(':');
                    const funcDef = customFunctions.find(f => f.id === fid);
                    const cc = funcDef ? colorClasses[funcDef.color] : colorClasses['blue'];
                    return `<div class="${cc.bg} ${cc.text} px-1 py-0.5 rounded text-[10px] font-bold mb-0.5">${funcDef ? funcDef.label : fid}: ${val}</div>`;
                }).join('');
                row += `<div class="gantt-cell border-r flex flex-col justify-center border-slate-50">${cellMarkup}</div>`;
            });
            target.innerHTML += row;
        }
        const k = i.cat === 'Product' ? 'prod' : 'eng';
        customFunctions.forEach(f => { poolTotals[k][f.id] += i.used[f.id]; });
        
        const label = `<li class="truncate px-2">• ${i.name}</li>`;
        let sumRem = 0;
        let sumAllButLast = 0;
        let lastId = customFunctions.length > 0 ? customFunctions[customFunctions.length-1].id : null;
        
        customFunctions.forEach(f => { 
            sumRem += i[`rem_${f.id}`]; 
            if(f.id !== lastId) {
                sumAllButLast += i[`rem_${f.id}`];
            }
        });
        
        if (!i.started) lists.unable.innerHTML += label; 
        else if (i.allDone) lists.completed.innerHTML += label; 
        else if (sumAllButLast < 0.01) lists.dev.innerHTML += label; 
        else lists.carried.innerHTML += label;
    });
    return poolTotals;
}

function openModal() { 
    editingId = null; 
    document.getElementById('modal-title').innerText = 'New Initiative'; 
    document.getElementById('new-name').value = ''; 
    customFunctions.forEach(f => {
        const el = document.getElementById(`new-${f.id}`);
        if(el) el.value = '';
    });
    document.getElementById('modal').style.display='flex'; 
}
function closeModal() { document.getElementById('modal').style.display='none'; }

function editInitiative(id) {
    editingId = id; const i = initiatives.find(x => x.id === id);
    document.getElementById('modal-title').innerText = 'Modify Initiative';
    document.getElementById('new-name').value = i.name; document.getElementById('new-cat').value = i.cat;
    document.getElementById('new-rank').value = i.rank; 
    customFunctions.forEach(f => {
        const el = document.getElementById(`new-${f.id}`);
        if(el) el.value = i[f.id] || 0;
    });
    document.getElementById('modal').style.display = 'flex';
}
function deleteInitiative(id) { initiatives = initiatives.filter(x => x.id !== id); updateDashboard(); }
function saveInitiative() {
    const cat = document.getElementById('new-cat').value, rank = parseInt(document.getElementById('new-rank').value);
    const data = { name: document.getElementById('new-name').value || "Project", cat, rank };
    customFunctions.forEach(f => {
        const el = document.getElementById(`new-${f.id}`);
        data[f.id] = el ? parseFloat(el.value) || 0 : 0;
    });
    
    if (editingId) {
        const idx = initiatives.findIndex(x => x.id === editingId);
        if (initiatives[idx].rank !== rank || initiatives[idx].cat !== cat) initiatives.forEach(i => { if (i.cat === cat && i.rank >= rank && i.id !== editingId) i.rank += 1; });
        initiatives[idx] = { ...initiatives[idx], ...data };
    } else { 
        initiatives.forEach(i => { if (i.cat === cat && i.rank >= rank) i.rank += 1; }); 
        initiatives.push({ id: Date.now(), ...data }); 
    }
    updateDashboard(); closeModal();
}

function openBulkModal() { 
    const hdrs = ['Name', 'Category', 'Rank', ...customFunctions.map(f => f.label)].join('\t');
    const rows = initiatives.sort((a,b) => (a.cat === b.cat ? a.rank - b.rank : (a.cat==='Product'?-1:1))).map(i => {
        return [i.name, i.cat, i.rank, ...customFunctions.map(f => i[f.id]||0)].join('\t');
    }).join('\n');
    document.getElementById('bulk-helper-text').innerText = `Tab-separated columns: Name, Category, Rank, ${customFunctions.map(f => f.label).join(', ')}`;
    document.getElementById('bulk-input').value = hdrs + '\n' + rows;
    document.getElementById('bulk-modal').style.display='flex'; 
}
function closeBulkModal() { document.getElementById('bulk-modal').style.display='none'; }

function processBulkImport() {
    const raw = document.getElementById('bulk-input').value.trim();
    if (!raw) { initiatives = []; updateDashboard(); closeBulkModal(); return; }
    const lines = raw.split('\n').filter(l => l.trim());
    let startIndex = 0;
    if(lines[0].toLowerCase().includes('name') && lines[0].toLowerCase().includes('category')) {
        startIndex = 1;
    }
    
    initiatives = lines.slice(startIndex).map(line => {
        const p = line.split('\t');
        let init = { id: Math.random(), name: (p[0]||'Task').trim(), cat: (p[1]||'Product').trim(), rank: parseInt(p[2]) || 1 };
        customFunctions.forEach((f, idx) => {
            init[f.id] = parseFloat(p[3 + idx]) || 0;
        });
        return init;
    });
    document.getElementById('reset-tip').classList.add('hidden');
    updateDashboard(); closeBulkModal();
}

// Functions Management
function openFunctionsModal() {
    renderFunctionsEditor();
    document.getElementById('functions-modal').style.display = 'flex';
}
function closeFunctionsModal() {
    document.getElementById('functions-modal').style.display = 'none';
}
function renderFunctionsEditor() {
    const list = document.getElementById('functions-editor-list');
    list.innerHTML = customFunctions.map((f, idx) => {
        const isQA = f.id === 'qa';
        return `
        <div class="grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100 func-row" ${!isQA ? 'draggable="true" ondragstart="dragFuncList(event, this)" ondragover="dragOverFuncList(event, this)" ondrop="dropFuncList(event, this)" ondragend="dragEndFuncList(event, this)"' : 'ondrop="dropFuncList(event, this)" ondragover="dragOverFuncList(event, this)"'} data-idx="${idx}">
            <div class="col-span-3 flex items-center gap-1">
                ${!isQA ? `<span class="text-slate-300 text-[10px] cursor-grab -ml-1 flex-shrink-0" title="Drag to sort">⣿</span>` : `<span class="text-slate-300 text-[10px] opacity-0 -ml-1 flex-shrink-0">⣿</span>`}
                <input type="text" class="w-full text-xs p-2 border rounded-lg font-bold func-label ${isQA ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : ''}" value="${f.label}" placeholder="e.g. BE" ${isQA ? 'disabled' : ''}>
            </div>
            <div class="col-span-2">
                <input type="text" class="w-full text-xs p-2 border rounded-lg font-mono func-id ${isQA ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : ''}" value="${f.id}" placeholder="Id" ${isQA ? 'disabled' : ''}>
            </div>
            <div class="col-span-2">
                <select class="w-full text-xs p-2 border rounded-lg func-color ${isQA ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : ''}" ${isQA ? 'disabled' : ''}>
                    ${availableColors.map(c => `<option value="${c}" ${c === f.color ? 'selected' : ''}>${c}</option>`).join('')}
                </select>
            </div>
            <div class="col-span-2">
                <input type="number" class="w-full text-xs p-2 border rounded-lg text-center font-bold func-hc" value="${f.headcount}">
            </div>
            <div class="col-span-2">
                <input type="number" class="w-full text-xs p-2 border rounded-lg text-center font-bold func-lim" value="${f.limit}">
            </div>
            <div class="col-span-1 text-center">
                ${isQA ? `<span class="text-[10px] text-slate-400 font-bold uppercase" title="Required function">Req</span>` : `<button onclick="removeFunctionRow(this)" class="text-red-500 hover:text-red-700 font-bold">✕</button>`}
            </div>
        </div>
    `}).join('');
}

let draggedRow = null;
window.dragFuncList = function(e, el) {
    if(el.querySelector('.func-id').disabled) { e.preventDefault(); return; }
    draggedRow = el;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', 'func'); 
    setTimeout(() => el.classList.add('opacity-50', 'bg-slate-100'), 0);
};
window.dragOverFuncList = function(e, el) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
};
window.dragEndFuncList = function(e, el) {
    el.classList.remove('opacity-50', 'bg-slate-100');
};
window.dropFuncList = function(e, el) {
    e.stopPropagation();
    if(draggedRow && draggedRow !== el) {
        const list = el.parentNode;
        if (el.querySelector('.func-id').disabled) {
            // Drop just before QA
            list.insertBefore(draggedRow, el);
            return false;
        }
        let rect = el.getBoundingClientRect();
        if(e.clientY > rect.top + (rect.height / 2)) {
            list.insertBefore(draggedRow, el.nextSibling);
        } else {
            list.insertBefore(draggedRow, el);
        }
    }
    return false;
}
function addFunctionRow() {
    const list = document.getElementById('functions-editor-list');
    const div = document.createElement('div');
    div.className = "grid grid-cols-12 gap-2 items-center bg-slate-50 p-2 rounded-xl border border-slate-100 func-row";
    div.innerHTML = `
        <div class="col-span-3">
            <input type="text" class="w-full text-xs p-2 border rounded-lg font-bold func-label" value="" placeholder="Label">
        </div>
        <div class="col-span-2">
            <input type="text" class="w-full text-xs p-2 border rounded-lg font-mono func-id" value="" placeholder="id">
        </div>
        <div class="col-span-2">
            <select class="w-full text-xs p-2 border rounded-lg func-color">
                ${availableColors.map(c => `<option value="${c}">${c}</option>`).join('')}
            </select>
        </div>
        <div class="col-span-2">
            <input type="number" class="w-full text-xs p-2 border rounded-lg text-center font-bold func-hc" value="1">
        </div>
        <div class="col-span-2">
            <input type="number" class="w-full text-xs p-2 border rounded-lg text-center font-bold func-lim" value="1">
        </div>
        <div class="col-span-1 text-center">
            <button onclick="removeFunctionRow(this)" class="text-red-500 hover:text-red-700 font-bold">✕</button>
        </div>
    `;
    list.appendChild(div);
}
function removeFunctionRow(btn) {
    btn.closest('.func-row').remove();
}
function saveFunctions() {
    const rows = document.querySelectorAll('.func-row');
    let newFuncs = [];
    rows.forEach(r => {
        let labelInput = r.querySelector('.func-label');
        let idInput = r.querySelector('.func-id');
        let colorInput = r.querySelector('.func-color');
        
        let label = labelInput.value.trim();
        let id = idInput.value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        let color = colorInput.value;
        let headcount = parseInt(r.querySelector('.func-hc').value) || 1;
        let limit = parseInt(r.querySelector('.func-lim').value) || 1;
        
        if (idInput.disabled && !idInput.value) {
            // Re-infer QA if someone hacked the DOM
            id = 'qa'; label = 'QA'; color = 'blue';
        } else if (idInput.disabled) {
            id = 'qa'; label = 'QA'; color = 'blue';
        }

        if(label && id) {
            newFuncs.push({ id, label, color, headcount, limit });
        }
    });
    
    // Ensure QA is at the end
    let qaIndex = newFuncs.findIndex(f => f.id === 'qa');
    if (qaIndex === -1) {
        newFuncs.push({ id: 'qa', label: 'QA', color: 'blue', limit: 2, headcount: 4 });
    } else {
        let qaFunc = newFuncs.splice(qaIndex, 1)[0];
        newFuncs.push(qaFunc);
    }

    if(newFuncs.length === 0) return alert('At least one function needed.');
    customFunctions = newFuncs;
    closeFunctionsModal();
    renderDynamicInputs();
    syncLimits();
    updateDashboard();
}

window.onload = () => { 
    renderDynamicInputs();
    autoSetHolidays(); 
    syncLimits(); 
    updateDashboard(); 
};
