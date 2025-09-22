document.addEventListener('DOMContentLoaded', () => {

    // =================================================================
    // 1. REFERENCIAS A ELEMENTOS DEL DOM
    // =================================================================
    const dom = {
        initialModal: document.getElementById('initial-modal'),
        continueSessionBtn: document.getElementById('continue-session-btn'),
        manualLoadBtn: document.getElementById('manual-load-btn'),
        importFileModalBtn: document.getElementById('import-file-modal-btn'),
        mainContentWrapper: document.getElementById('main-content-wrapper'),
        menuToggle: document.getElementById('menu-toggle'),
        mainNav: document.getElementById('main-nav'),
        selectMonth: document.getElementById('select-month'),
        goalSubscriptions: document.getElementById('goal-subscriptions'),
        advisorCount: document.getElementById('advisor-count'),
        subscriptionValue: document.getElementById('subscription-value'),
        fixedCosts: document.getElementById('fixed-costs'),
        totalSubscriptionsResult: document.getElementById('total-subscriptions-result'),
        monthGoalResult: document.getElementById('month-goal-result'),
        goalPercentageResult: document.getElementById('goal-percentage-result'),
        goalProgressBar: document.getElementById('goal-progress-bar'),
        surplusDeficitResult: document.getElementById('surplus-deficit-result'),
        leaderPoolResult: document.getElementById('leader-pool-result'),
        leaderPoolBreakdown: document.getElementById('leader-pool-breakdown'),
        estimatedProfitResult: document.getElementById('estimated-profit-result'),
        advisorsPerformanceTable: document.getElementById('advisors-performance-table'),
        downloadTemplateBtn: document.getElementById('download-template-btn'),
        importFileBtn: document.getElementById('import-file-btn'),
        fileInput: document.getElementById('file-input'),
        exportResultsBtn: document.getElementById('export-results-btn'),
        resetAppBtn: document.getElementById('reset-app-btn'),
        advancedConfigDetails: document.getElementById('advanced-config-details'),
        advisorsList: document.getElementById('advisors-list'),
        monthlyGoals: document.getElementById('monthly-goals'),
        advisorCommissionTbody: document.getElementById('advisor-commission-tbody'),
        addAdvisorCommissionRow: document.getElementById('add-advisor-commission-row'),
        leaderCommissionTbody: document.getElementById('leader-commission-tbody'),
        addLeaderCommissionRow: document.getElementById('add-leader-commission-row'),
        leaderDistributionTbody: document.getElementById('leader-distribution-tbody'),
        addLeaderDistributionRow: document.getElementById('add-leader-distribution-row'),
        seniorBonusValue: document.getElementById('senior-bonus-value'),
        saveConfigBtn: document.getElementById('save-config-btn')
    };

    // =================================================================
    // 2. ESTADO DE LA APLICACIÓN Y CONSTANTES
    // =================================================================
    const REAL_REVENUE_MULTIPLIER = 0.838427947598;
    let AppConfig = {};
    let performanceData = {};

    const setDefaultState = () => {
        AppConfig = {
            subscriptionValue: 229000,
            fixedCosts: 0,
            seniorBonusValue: 85000,
            advisors: [],
            monthlyGoals: {},
            advisorCommissionTiers: [],
            leaderCommissionTiers: [],
            leaderDistribution: [],
            currentMonth: ''
        };
        performanceData = {};
    };

    // =================================================================
    // 3. FUNCIONES DE UTILIDAD
    // =================================================================
    const formatCurrency = (value) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value || 0);
    const parseCurrency = (value) => Number(String(value).replace(/[^0-9,-]+/g, "").replace(",", ".")) || 0;

    // =================================================================
    // 4. LÓGICA DE NEGOCIO Y CÁLCULOS
    // =================================================================
    const getAdvisorCommissionRate = (subscriptions) => {
        let applicableRate = 0;
        const sortedTiers = [...(AppConfig.advisorCommissionTiers || [])].sort((a, b) => a.min - b.min);
        for (const tier of sortedTiers) {
            if (subscriptions >= tier.min) applicableRate = tier.rate / 100;
        }
        return applicableRate;
    };

    const getLeaderCommissionRate = (goalPercentage) => {
        let applicableRate = 0;
        const sortedTiers = [...(AppConfig.leaderCommissionTiers || [])].sort((a, b) => a.min - b.min);
        for (const tier of sortedTiers) {
            if (goalPercentage >= tier.min) applicableRate = tier.rate / 100;
        }
        return applicableRate;
    };

    const calculateAll = () => {
        AppConfig.subscriptionValue = parseCurrency(dom.subscriptionValue.value);
        AppConfig.fixedCosts = parseCurrency(dom.fixedCosts.value);
        AppConfig.currentMonth = dom.selectMonth.value;
        const currentMonthGoal = AppConfig.monthlyGoals[AppConfig.currentMonth] || 0;

        let totals = { subscriptions: 0, grossRevenue: 0, realRevenue: 0, commissionPayment: 0, seniorBonus: 0, totalPayment: 0 };

        const performanceResults = (AppConfig.advisors || []).map(advisorName => {
            const advisorData = performanceData[advisorName] || { grossRevenue: 0, isSenior: false };
            const grossRevenue = advisorData.grossRevenue;
            const subscriptions = AppConfig.subscriptionValue > 0 ? grossRevenue / AppConfig.subscriptionValue : 0;
            const realRevenue = grossRevenue * REAL_REVENUE_MULTIPLIER;
            const commissionRate = getAdvisorCommissionRate(subscriptions);
            const commissionPayment = realRevenue * commissionRate;
            const seniorBonus = advisorData.isSenior ? AppConfig.seniorBonusValue : 0;
            const totalPayment = commissionPayment + seniorBonus;

            totals.subscriptions += subscriptions;
            totals.grossRevenue += grossRevenue;
            totals.realRevenue += realRevenue;
            totals.commissionPayment += commissionPayment;
            totals.seniorBonus += seniorBonus;
            totals.totalPayment += totalPayment;

            return { name: advisorName, ...advisorData, subscriptions, realRevenue, commissionRate, commissionPayment, seniorBonus, totalPayment };
        });

        const goalPercentage = currentMonthGoal > 0 ? (totals.subscriptions / currentMonthGoal) * 100 : 0;
        const grossSurplusDeficit = totals.grossRevenue - (currentMonthGoal * AppConfig.subscriptionValue);
        const leaderPool = totals.realRevenue * getLeaderCommissionRate(goalPercentage);
        const estimatedProfit = totals.realRevenue - totals.totalPayment - leaderPool - AppConfig.fixedCosts;

        return { totals, performanceResults, mainResults: { goalPercentage, grossSurplusDeficit, leaderPool, estimatedProfit, currentMonthGoal } };
    };

    // =================================================================
    // 5. FUNCIONES DE RENDERIZADO (ACTUALIZACIÓN DEL DOM)
    // =================================================================
    const renderPerformanceTable = (performanceResults, totals) => {
        const tbody = dom.advisorsPerformanceTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        (performanceResults || []).forEach(res => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${res.name}</td>
                <td class="checkbox-cell"><input type="checkbox" class="senior-checkbox" data-advisor="${res.name}" ${res.isSenior ? 'checked' : ''}></td>
                <td><input type="text" class="performance-input currency-input" data-advisor="${res.name}" value="${formatCurrency(res.grossRevenue)}"></td>
                <td>${res.subscriptions.toFixed(2)}</td>
                <td>${formatCurrency(res.realRevenue)}</td>
                <td>${(res.commissionRate * 100).toFixed(2)}%</td>
                <td>${formatCurrency(res.commissionPayment)}</td>
                <td>${formatCurrency(res.seniorBonus)}</td>
                <td>${formatCurrency(res.totalPayment)}</td>
            `;
            tbody.appendChild(row);
        });
        
        const totalsRow = document.createElement('tr');
        totalsRow.className = 'totals-row';
        totalsRow.innerHTML = `
            <th colspan="2">TOTALES</th>
            <td>${formatCurrency(totals.grossRevenue)}</td>
            <td>${totals.subscriptions.toFixed(2)}</td>
            <td>${formatCurrency(totals.realRevenue)}</td>
            <td>-</td>
            <td>${formatCurrency(totals.commissionPayment)}</td>
            <td>${formatCurrency(totals.seniorBonus)}</td>
            <td>${formatCurrency(totals.totalPayment)}</td>
        `;
        tbody.appendChild(totalsRow);
    };

    const renderResults = (mainResults, totals) => {
        dom.totalSubscriptionsResult.textContent = totals.subscriptions.toFixed(2);
        dom.monthGoalResult.textContent = mainResults.currentMonthGoal;
        dom.goalPercentageResult.textContent = `${mainResults.goalPercentage.toFixed(2)}%`;
        const progress = Math.min(mainResults.goalPercentage, 100);
        dom.goalProgressBar.style.width = `${progress}%`;
        dom.goalProgressBar.style.backgroundColor = progress >= 100 ? 'var(--success-color)' : progress >= 60 ? 'var(--warning-color)' : 'var(--danger-color)';
        dom.surplusDeficitResult.textContent = formatCurrency(mainResults.grossSurplusDeficit);
        dom.surplusDeficitResult.style.color = mainResults.grossSurplusDeficit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        dom.leaderPoolResult.textContent = formatCurrency(mainResults.leaderPool);
        dom.leaderPoolBreakdown.innerHTML = (AppConfig.leaderDistribution || [])
            .map(dist => `<li>${dist.role}: ${formatCurrency(mainResults.leaderPool * (dist.percentage / 100))}</li>`)
            .join('');
        dom.estimatedProfitResult.textContent = formatCurrency(mainResults.estimatedProfit);
        dom.estimatedProfitResult.style.color = mainResults.estimatedProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    };

    const renderAll = () => {
        if (!AppConfig || !AppConfig.advisors) return;
        const { totals, performanceResults, mainResults } = calculateAll();
        renderPerformanceTable(performanceResults, totals);
        renderResults(mainResults, totals);
    };

    const populateConfigForms = () => {
        dom.subscriptionValue.value = formatCurrency(AppConfig.subscriptionValue);
        dom.fixedCosts.value = formatCurrency(AppConfig.fixedCosts);
        dom.selectMonth.innerHTML = Object.keys(AppConfig.monthlyGoals).map(month => `<option value="${month}" ${month === AppConfig.currentMonth ? 'selected' : ''}>${month}</option>`).join('');
        dom.goalSubscriptions.value = AppConfig.monthlyGoals[AppConfig.currentMonth] || 0;
        dom.advisorCount.value = (AppConfig.advisors || []).length;
        dom.advisorsList.value = (AppConfig.advisors || []).join('\n');
        dom.monthlyGoals.value = Object.entries(AppConfig.monthlyGoals || {}).map(([month, goal]) => `${month}=${goal}`).join('\n');
        renderDynamicTable(dom.advisorCommissionTbody, AppConfig.advisorCommissionTiers || [], ['min', 'rate']);
        renderDynamicTable(dom.leaderCommissionTbody, AppConfig.leaderCommissionTiers || [], ['min', 'rate']);
        renderDynamicTable(dom.leaderDistributionTbody, AppConfig.leaderDistribution || [], ['role', 'percentage']);
        dom.seniorBonusValue.value = formatCurrency(AppConfig.seniorBonusValue);
    };

    // =================================================================
    // 6. GESTIÓN DE ESTADO (LOCALSTORAGE)
    // =================================================================
    const saveStateToLocalStorage = () => {
        localStorage.setItem('commissionCalculatorConfig', JSON.stringify(AppConfig));
        localStorage.setItem('commissionCalculatorPerformance', JSON.stringify(performanceData));
    };

    const saveAdvancedConfig = () => {
        try {
            const leaderDistribution = readDynamicTable(dom.leaderDistributionTbody, ['role', 'percentage']);
            const totalDistribution = leaderDistribution.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);

            if (Math.round(totalDistribution) !== 100 && leaderDistribution.length > 0) {
                alert(`La suma de la Distribución de Líderes debe ser 100%, pero actualmente es ${totalDistribution}%.`);
                return;
            }

            AppConfig.leaderDistribution = leaderDistribution;
            AppConfig.advisors = dom.advisorsList.value.split('\n').map(s => s.trim()).filter(Boolean);
            const goals = {};
            dom.monthlyGoals.value.split('\n').forEach(line => {
                const [month, goal] = line.split('=').map(s => s.trim());
                if (month && goal && !isNaN(goal)) goals[month] = parseInt(goal);
            });
            AppConfig.monthlyGoals = goals;
            AppConfig.currentMonth = dom.selectMonth.value || Object.keys(goals)[0] || '';
            AppConfig.advisorCommissionTiers = readDynamicTable(dom.advisorCommissionTbody, ['min', 'rate']);
            AppConfig.leaderCommissionTiers = readDynamicTable(dom.leaderCommissionTbody, ['min', 'rate']);
            AppConfig.seniorBonusValue = parseCurrency(dom.seniorBonusValue.value);

            saveStateToLocalStorage();
            dom.mainContentWrapper.classList.remove('locked');
            dom.advancedConfigDetails.open = false;
            populateConfigForms();
            renderAll();
            alert('¡Configuración guardada exitosamente!');
        } catch (error) {
            alert('Error al guardar la configuración: ' + error.message);
            console.error(error);
        }
    };

    // =================================================================
    // 7. MANEJO DE TABLAS DINÁMICAS
    // =================================================================
    const renderDynamicTable = (tbody, data, columns) => {
        tbody.innerHTML = '';
        (data || []).forEach(item => {
            const row = document.createElement('tr');
            let cells = '';
            columns.forEach(col => {
                const isText = col === 'role';
                cells += `<td><input type="${isText ? 'text' : 'number'}" data-col="${col}" value="${item[col] || ''}"></td>`;
            });
            cells += `<td><button class="btn btn-danger btn-sm delete-row-btn"><i class="fas fa-trash"></i></button></td>`;
            row.innerHTML = cells;
            tbody.appendChild(row);
        });
    };

    const readDynamicTable = (tbody, columns) => {
        const data = [];
        tbody.querySelectorAll('tr').forEach(row => {
            const item = {};
            let isValid = true;
            row.querySelectorAll('input').forEach(input => {
                const col = input.dataset.col;
                const value = input.type === 'number' ? parseFloat(input.value) : input.value.trim();
                if ((input.type === 'number' && isNaN(value)) || value === '') {
                    isValid = false;
                }
                item[col] = value;
            });
            if (isValid) data.push(item);
        });
        return data;
    };

    const addDynamicTableRow = (tbody, columns) => {
        const row = document.createElement('tr');
        let cells = '';
        columns.forEach(col => {
            const isText = col === 'role';
            cells += `<td><input type="${isText ? 'text' : 'number'}" data-col="${col}" placeholder="..."></td>`;
        });
        cells += `<td><button class="btn btn-danger btn-sm delete-row-btn"><i class="fas fa-trash"></i></button></td>`;
        row.innerHTML = cells;
        tbody.appendChild(row);
    };

    // =================================================================
    // 8. IMPORTACIÓN Y EXPORTACIÓN (SHEETJS)
    // =================================================================
    const handleFileImport = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const getSheetData = (sheetName) => {
                    const worksheet = workbook.Sheets[sheetName];
                    if (!worksheet) return [];
                    return XLSX.utils.sheet_to_json(worksheet);
                };
                
                const performance = getSheetData('Desempeño');
                const generalConfig = getSheetData('ConfiguracionGeneral')[0] || {};
                const monthlyGoalsData = getSheetData('MetasMensuales');
                const advisorCommissions = getSheetData('ComisionesOrientadores');
                const leaderCommissions = getSheetData('ComisionesLideres');
                const leaderDistributionData = getSheetData('DistribucionLideres');
                
                setDefaultState();

                AppConfig.subscriptionValue = generalConfig.ValorSuscripcion || AppConfig.subscriptionValue;
                AppConfig.fixedCosts = generalConfig.CostosFijos || 0;
                AppConfig.seniorBonusValue = generalConfig.BonoSenior || AppConfig.seniorBonusValue;
                
                AppConfig.advisors = performance.map(p => p.Orientador);
                performance.forEach(p => {
                    performanceData[p.Orientador] = {
                        grossRevenue: p.RecaudoBruto || 0,
                        isSenior: String(p.Senior).toLowerCase() === 'si'
                    };
                });

                AppConfig.monthlyGoals = monthlyGoalsData.reduce((acc, item) => {
                    if(item.Mes && item.Meta) acc[item.Mes] = item.Meta;
                    return acc;
                }, {});
                AppConfig.currentMonth = Object.keys(AppConfig.monthlyGoals)[0] || '';
                
                AppConfig.advisorCommissionTiers = advisorCommissions.map(c => ({ min: c.MinSuscripciones, rate: c.TasaPorcentaje }));
                AppConfig.leaderCommissionTiers = leaderCommissions.map(c => ({ min: c.MinCumplimiento, rate: c.TasaPorcentaje }));
                AppConfig.leaderDistribution = leaderDistributionData.map(d => ({ role: d.Rol, percentage: d.Porcentaje }));

                saveStateToLocalStorage();
                dom.mainContentWrapper.classList.remove('locked');
                dom.initialModal.classList.remove('active');
                populateConfigForms();
                renderAll();
                alert('¡Archivo importado exitosamente!');
            } catch (error) {
                alert(`Error al importar el archivo: ${error.message}`);
                console.error(error);
            } finally {
                dom.fileInput.value = '';
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const exportData = (isTemplate = false) => {
        const wb = XLSX.utils.book_new();

        const performanceSheetData = [['Orientador', 'RecaudoBruto', 'Senior']];
        (AppConfig.advisors || []).forEach(name => {
            const data = performanceData[name] || { grossRevenue: 0, isSenior: false };
            performanceSheetData.push([name, isTemplate ? '' : data.grossRevenue, isTemplate ? 'No' : (data.isSenior ? 'Si' : 'No')]);
        });
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(performanceSheetData), 'Desempeño');

        const configSheetData = [['ValorSuscripcion', 'CostosFijos', 'BonoSenior'], [isTemplate ? 229000 : AppConfig.subscriptionValue, isTemplate ? 0 : AppConfig.fixedCosts, isTemplate ? 85000 : AppConfig.seniorBonusValue]];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configSheetData), 'ConfiguracionGeneral');

        const goalsSheetData = [['Mes', 'Meta'], ['Enero', 100], ['Febrero', 120]];
        if (!isTemplate) { goalsSheetData.splice(1, Infinity, ...Object.entries(AppConfig.monthlyGoals)); }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(goalsSheetData), 'MetasMensuales');

        const advisorCommSheetData = [['MinSuscripciones', 'TasaPorcentaje'], [0, 5], [10, 8]];
        if (!isTemplate) { advisorCommSheetData.splice(1, Infinity, ...AppConfig.advisorCommissionTiers.map(t => [t.min, t.rate])); }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(advisorCommSheetData), 'ComisionesOrientadores');

        const leaderCommSheetData = [['MinCumplimiento', 'TasaPorcentaje'], [80, 1], [100, 1.5]];
        if (!isTemplate) { leaderCommSheetData.splice(1, Infinity, ...AppConfig.leaderCommissionTiers.map(t => [t.min, t.rate])); }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(leaderCommSheetData), 'ComisionesLideres');

        const distSheetData = [['Rol', 'Porcentaje'], ['Líder 1', 60], ['Líder 2', 40]];
        if (!isTemplate) { distSheetData.splice(1, Infinity, ...AppConfig.leaderDistribution.map(d => [d.role, d.percentage])); }
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(distSheetData), 'DistribucionLideres');
        
        const fileName = isTemplate ? 'Plantilla_Calculadora_Comisiones.xlsx' : `Resultados_${AppConfig.currentMonth}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // =================================================================
    // 9. SETUP DE EVENT LISTENERS
    // =================================================================
    function setupEventListeners() {
        dom.continueSessionBtn.addEventListener('click', () => {
            dom.initialModal.classList.remove('active');
            dom.mainContentWrapper.classList.remove('locked');
            populateConfigForms();
            renderAll();
        });
        dom.manualLoadBtn.addEventListener('click', () => {
            setDefaultState();
            populateConfigForms();
            dom.initialModal.classList.remove('active');
            dom.advancedConfigDetails.open = true;
            dom.advancedConfigDetails.scrollIntoView();
        });
        dom.resetAppBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres borrar todos los datos y empezar de nuevo?')) {
                localStorage.clear();
                location.reload();
            }
        });
        dom.importFileModalBtn.addEventListener('click', () => dom.fileInput.click());
        dom.importFileBtn.addEventListener('click', () => dom.fileInput.click());
        dom.fileInput.addEventListener('change', handleFileImport);
        dom.downloadTemplateBtn.addEventListener('click', () => exportData(true));
        dom.exportResultsBtn.addEventListener('click', () => exportData(false));
        dom.menuToggle.addEventListener('click', () => dom.mainNav.classList.toggle('nav-open'));
        dom.mainNav.addEventListener('click', (e) => { if (e.target.tagName === 'A') dom.mainNav.classList.remove('nav-open'); });
        dom.saveConfigBtn.addEventListener('click', saveAdvancedConfig);
        dom.addAdvisorCommissionRow.addEventListener('click', () => addDynamicTableRow(dom.advisorCommissionTbody, ['min', 'rate']));
        dom.addLeaderCommissionRow.addEventListener('click', () => addDynamicTableRow(dom.leaderCommissionTbody, ['min', 'rate']));
        dom.addLeaderDistributionRow.addEventListener('click', () => addDynamicTableRow(dom.leaderDistributionTbody, ['role', 'percentage']));
        document.body.addEventListener('click', (e) => { if (e.target.closest('.delete-row-btn')) e.target.closest('tr').remove(); });
        [dom.subscriptionValue, dom.fixedCosts].forEach(input => {
            input.addEventListener('change', (e) => {
                e.target.value = formatCurrency(parseCurrency(e.target.value));
                renderAll();
                saveStateToLocalStorage();
            });
        });
        dom.selectMonth.addEventListener('change', () => {
            AppConfig.currentMonth = dom.selectMonth.value;
            dom.goalSubscriptions.value = AppConfig.monthlyGoals[AppConfig.currentMonth] || 0;
            renderAll();
            saveStateToLocalStorage();
        });
        dom.advisorsPerformanceTable.addEventListener('change', (e) => {
            const advisorName = e.target.dataset.advisor;
            if (!advisorName) return;
            if (!performanceData[advisorName]) performanceData[advisorName] = { grossRevenue: 0, isSenior: false };
            if (e.target.classList.contains('performance-input')) {
                const value = parseCurrency(e.target.value);
                e.target.value = formatCurrency(value);
                performanceData[advisorName].grossRevenue = value;
            } else if (e.target.classList.contains('senior-checkbox')) {
                performanceData[advisorName].isSenior = e.target.checked;
            }
            renderAll();
            saveStateToLocalStorage();
        });
    }

    // =================================================================
    // 10. INICIALIZACIÓN DE LA APLICACIÓN
    // =================================================================
    function init() {
        setupEventListeners();
        const savedConfig = localStorage.getItem('commissionCalculatorConfig');
        dom.initialModal.classList.add('active');
        if (savedConfig) {
            dom.continueSessionBtn.style.display = 'block';
            AppConfig = JSON.parse(savedConfig);
            const savedPerformance = localStorage.getItem('commissionCalculatorPerformance');
            if (savedPerformance) performanceData = JSON.parse(savedPerformance);
        } else {
            setDefaultState();
            dom.mainContentWrapper.classList.add('locked');
        }
    }
    
    init();
});