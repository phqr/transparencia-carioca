let barChart, pieChart, evolutionChart
let currentPage = 1
let itemsPerPage = 10
let sortColumn = null
let sortDirection = 'asc'
let currentYear = '2023'
let allData = null

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        notation: 'compact'
    }).format(value)
}

function getPercentageClass(percentage) {
    if (percentage >= 80) return 'high'
    if (percentage >= 60) return 'medium'
    return 'low'
}

function changeYear(year) {
    currentYear = year
    const yearData = allData.ranking_por_ano[year]
    currentPage = 1
    
    updateAnnualStats(yearData)
    renderAnnualTable(yearData)
    updateAnnualCharts(yearData)
}

async function loadData() {
    try {
        let response = await fetch('gastos_rj.json')
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }

        allData = await response.json()

        let yearSelect = document.querySelector('#year-select')
        for (let i = allData.metadata.anos.length - 1; i >= 0; i--) {
            let year = allData.metadata.anos[i]
            let opt = document.createElement('option')
            opt.value = year
            opt.innerHTML = year
            opt.selected = String(year) === currentYear
            yearSelect.appendChild(opt)
        }
        
        let selectedYearData = allData.ranking_por_ano[currentYear]

        updateAnnualStats(selectedYearData)
        renderAnnualTable(selectedYearData)
        createAnnualCharts(selectedYearData)
        createEvolucaoChart()

        document.getElementById('content').style.display = 'block'

    } catch (error) {
        console.error('Erro ao carregar dados:', error)
        let errorDiv = document.getElementById('error')
        errorDiv.innerHTML = `
            <div class="error">
                <strong>Erro ao carregar dados:</strong> ${error.message}
            </div>
        `
        errorDiv.style.display = 'block'
    }
}

// Estatisticas Anuais
function updateAnnualStats(yearData) {
    document.getElementById('orcamento-total').textContent = formatCurrency(yearData.metadata.total_orcamento_atualizado)
    
    document.getElementById('total-empenhado').textContent = `Total empenhado: ${formatCurrency(yearData.metadata.total_empenhado)}`
    
    document.getElementById('pago-total').textContent = formatCurrency(yearData.metadata.total_pago)
    let overallPercentage = (yearData.metadata.total_pago / yearData.metadata.total_orcamento_atualizado) * 100
    document.getElementById('percentual-pago').textContent = `${overallPercentage.toFixed(2)}% do orçamento`
    
    document.getElementById('pago-restos-total').textContent = formatCurrency(yearData.metadata.total_pago_com_restos)
    document.getElementById('total-orgaos').textContent = yearData.orgaos.length
}

// Tabela
function renderAnnualTable(yearData) {
    let tbody = document.getElementById('tableBody')
    tbody.innerHTML = ''

    let startIndex = (currentPage - 1) * itemsPerPage
    
    let allOrgaosData = yearData.orgaos
    let currentPageData = allOrgaosData.slice(startIndex, startIndex + itemsPerPage)
    currentPageData.forEach(orgao => {
        const row = tbody.insertRow()
        row.innerHTML = `
            <td>${orgao.orgao}</td>
            <td>${formatCurrency(orgao.orcamento_atualizado)}</td>
            <td>${formatCurrency(orgao.pago)}</td>
            <td>
                <span class="percentage ${getPercentageClass(orgao.percentual_execucao)}">
                    ${orgao.percentual_execucao.toFixed(2)}%
                </span>
            </td>
        `
    })

    let totalPages = Math.ceil(allOrgaosData.length / itemsPerPage)
    let paginationPagesEl = document.getElementById('pagination-pages')
    let paginationInfoEl = document.getElementById('pagination-info')
    paginationPagesEl.innerHTML = ''
    paginationInfoEl.innerHTML = ''

    let prevBtn = document.createElement('button')
    prevBtn.textContent = '← Anterior'
    prevBtn.disabled = currentPage === 1
    prevBtn.onclick = () => changePage(currentPage - 1)
    paginationPagesEl.appendChild(prevBtn)

    let maxButtons = 7
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2))
    let endPage = Math.min(totalPages, startPage + maxButtons - 1)

    if (endPage - startPage < maxButtons - 1) {
        startPage = Math.max(1, endPage - maxButtons + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
        let pageBtn = document.createElement('button')
        pageBtn.textContent = i
        pageBtn.className = i === currentPage ? 'active' : ''
        pageBtn.onclick = () => changePage(i)
        paginationPagesEl.appendChild(pageBtn)
    }

    let nextBtn = document.createElement('button')
    nextBtn.textContent = 'Próximo →'
    nextBtn.disabled = currentPage === totalPages
    nextBtn.onclick = () => changePage(currentPage + 1)
    paginationPagesEl.appendChild(nextBtn)

    let info = document.createElement('span')
    info.className = 'pagination-info'
    info.textContent = `Página ${currentPage} de ${totalPages}`
    paginationInfoEl.appendChild(info)
}

function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc'
    } else {
        sortColumn = column
        sortDirection = 'desc'
    }

    document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('asc', 'desc')
    })
    
    document.getElementById(column).classList.add(sortDirection)

    allData.ranking_por_ano[currentYear].orgaos.sort((a, b) => {
        let aValue = a[column]
        let bValue = b[column]

        if (typeof aValue === 'string') {
            aValue = aValue.toLowerCase()
            bValue = bValue.toLowerCase()
        }

        if (sortDirection === 'asc') {
            return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
        } else {
            return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
        }
    })

    currentPage = 1
    let yearData = allData.ranking_por_ano[currentYear]
    renderAnnualTable(yearData)
}

function changeItemsPerPage(value) {
    itemsPerPage = parseInt(value)
    currentPage = 1
    let yearData = allData.ranking_por_ano[currentYear]
    renderAnnualTable(yearData)
}

function changePage(page) {
    currentPage = page
    let yearData = allData.ranking_por_ano[currentYear]
    renderAnnualTable(yearData)
}

// Gráficos
function createAnnualCharts(yearData) {
    const top10orgaos = yearData.orgaos.slice(0, 10)
    
    // Gráfico de barras
    let ctxBar = document.getElementById('topOrgaosChart').getContext('2d')
    barChart = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: top10orgaos.map(o => o.orgao.substring(0, 40)),
            datasets: [
                {
                    label: 'Valor do Orçamento Atualizado (R$)',
                    data: top10orgaos.map(o => o.orcamento_atualizado),
                    backgroundColor: '#2564ebc5',
                },
                {
                    label: 'Valor Pago (R$)',
                    data: top10orgaos.map(o => o.pago),
                    backgroundColor: '#f59f0bc5',
                }
            ]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.x)
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        callback: (value) => formatCurrency(value)
                    }
                }
            }
        }
    })

    // Gráfico de pizza
    let ctxPie = document.getElementById('pieChart').getContext('2d')
    pieChart = new Chart(ctxPie, {
        type: 'pie',
        data: {
            labels: top10orgaos.map(o => {
                let orgaoName = o.orgao.substring(0, 50)
                return orgaoName.length < o.orgao.length ? orgaoName + '...' : orgaoName
            }),
            datasets: [{
                label: 'Valor Pago',
                data: top10orgaos.map(o => o.pago),
                backgroundColor: [
                    'rgba(102, 126, 234, 0.8)',
                    'rgba(118, 75, 162, 0.8)',
                    'rgba(235, 209, 103, 0.8)',
                    'rgba(255, 159, 64, 0.8)',
                    'rgba(255, 99, 132, 0.8)',
                    'rgba(54, 162, 235, 0.8)',
                    'rgba(75, 192, 192, 0.8)',
                    'rgba(153, 102, 255, 0.8)',
                    'rgba(255, 206, 86, 0.8)',
                    'rgba(231, 76, 60, 0.8)'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        padding: 15,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            let total = context.dataset.data.reduce((a, b) => a + b, 0)
                            let percentage = ((context.parsed / total) * 100).toFixed(2)
                            return ` ${percentage}% (${formatCurrency(context.parsed)})`
                        }
                    }
                }
            },
            animation: {
                duration: 750
            }
        }
    })
}

function updateAnnualCharts(yearData) {
    let top10 = yearData.orgaos.slice(0, 10)
    
    barChart.data.labels = top10.map(o => o.orgao.substring(0, 40))
    barChart.data.datasets[0].data = top10.map(o => o.orcamento_atualizado)
    barChart.data.datasets[1].data = top10.map(o => o.pago)
    barChart.update()
    
    pieChart.data.labels = top10.map(o => {
        let nome = o.orgao.substring(0, 50)
        return nome.length < o.orgao.length ? nome + '...' : nome
    })
    pieChart.data.datasets[0].data = top10.map(o => o.pago)
    pieChart.update()
}

function toggleChart(type) {
    let barContent = document.getElementById('barChartContent')
    let pieContent = document.getElementById('pieChartContent')
    let buttons = document.querySelectorAll('.toggle-chart-btn')

    if (type === 'bar') {
        barContent.classList.add('active')
        pieContent.classList.remove('active')
        buttons[0].classList.add('active')
        buttons[1].classList.remove('active')
    } else {
        barContent.classList.remove('active')
        pieContent.classList.add('active')
        buttons[0].classList.remove('active')
        buttons[1].classList.add('active')
    }
}

// Gráfico de Evolução Temporal
function createEvolucaoChart() {
    const years = allData.metadata.anos.sort()
    const evolutionData = {
        orcamento: [],
        empenhado: [],
        pago: []
    }
    
    let totalOrcamento = 0
    let totalEmpenhado = 0
    let totalPago = 0
    
    years.forEach(ano => {
        const yearData = allData.ranking_por_ano[ano]
        evolutionData.orcamento.push(yearData.metadata.total_orcamento_atualizado)
        evolutionData.empenhado.push(yearData.metadata.total_empenhado)
        evolutionData.pago.push(yearData.metadata.total_pago)
        
        totalOrcamento += yearData.metadata.total_orcamento_atualizado
        totalEmpenhado += yearData.metadata.total_empenhado
        totalPago += yearData.metadata.total_pago
    })
    
    document.getElementById('evolution-orcamento-total').textContent = formatCurrency(totalOrcamento)
    document.getElementById('evolution-empenhado-total').textContent = formatCurrency(totalEmpenhado)
    document.getElementById('evolution-pago-total').textContent = formatCurrency(totalPago)
    
    const ctx = document.getElementById('evolutionChart').getContext('2d')
    evolutionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: years,
            datasets: [
                {
                    label: 'Orçamento Atualizado',
                    data: evolutionData.orcamento,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Empenhado',
                    data: evolutionData.empenhado,
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8
                },
                {
                    label: 'Pago',
                    data: evolutionData.pago,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    pointRadius: 6,
                    pointHoverRadius: 8
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            weight: 600
                        },
                        padding: 15,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    padding: 12,
                    titleFont: {
                        size: 14,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 13
                    },
                    callbacks: {
                        label: (context) => {
                            return context.dataset.label + ': ' + formatCurrency(context.parsed.y)
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: (value) => formatCurrency(value),
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        font: {
                            size: 13,
                            weight: 600
                        }
                    }
                }
            }
        }
    })
}

function toggleView(container) {
    let contents = document.getElementsByClassName("annual-view")
    for (let el of contents) {
        el.classList.remove("active")
    }

    document.getElementById(container).classList.add("active")
}

function togglePage(container) {
    let contents = document.getElementsByClassName("page")
    for (let el of contents) {
        el.classList.remove("active")
    }

    let isAnnualContent = container === 'annual-page'
    document.getElementById('year-select').disabled = !isAnnualContent

    document.getElementById(container).classList.add("active")
}

document.addEventListener('DOMContentLoaded', loadData)
