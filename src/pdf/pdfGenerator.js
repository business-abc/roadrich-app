/**
 * RoadRich PDF Generator - Main Assembly File
 * Generates Premium Dark Mode Monthly Reports
 */

import { colors, defaultStyle, styles } from './pdfTheme.js';
import {
    createHeader,
    createSectionTitle,
    createBentoRow,
    createTechTable,
    createInsightsSection,
    createFooter
} from './pdfComponents.js';

// pdfMake is loaded dynamically to avoid blocking app startup
let pdfMake = null;

async function loadPdfMake() {
    if (pdfMake) return pdfMake;

    const pdfMakeModule = await import('pdfmake/build/pdfmake');
    const pdfFontsModule = await import('pdfmake/build/vfs_fonts');

    pdfMake = pdfMakeModule.default;
    pdfMake.vfs = pdfFontsModule.default.pdfMake.vfs;

    return pdfMake;
}

/**
 * Generates and downloads the monthly expense report
 * @param {object} data - Report data
 */
export async function generateMonthlyReport(data) {
    // Load pdfmake lazily
    const pdf = await loadPdfMake();
    const {
        monthName,
        totalExpenses,
        prevTotalExpenses,
        income,
        categories,
        prevCategories,
        expenses = [],
        prevExpenses = []
    } = data;

    // === CALCULATIONS ===
    const expenseVariation = prevTotalExpenses > 0
        ? Math.round(((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100)
        : 0;

    const savings = income - totalExpenses;
    const savingsRate = income > 0 ? Math.round((savings / income) * 100) : 0;

    const medianDaily = calculateMedianDailyExpense(expenses);
    const prevMedianDaily = calculateMedianDailyExpense(prevExpenses);
    const dailyVariation = prevMedianDaily > 0
        ? Math.round(((medianDaily - prevMedianDaily) / prevMedianDaily) * 100)
        : 0;

    // === SUMMARY CARDS ===
    const summaryCards = [
        {
            title: 'DÉPENSES',
            value: `${formatNumber(totalExpenses)} €`,
            subtitle: formatVariation(expenseVariation, true),
            accent: colors.cyan
        },
        {
            title: 'ÉPARGNE',
            value: `${formatNumber(savings)} €`,
            subtitle: `${savingsRate}% du revenu`,
            accent: colors.gold
        },
        {
            title: 'DÉPENSE / JOUR',
            value: `${formatNumber(medianDaily)} €`,
            subtitle: formatVariation(dailyVariation, true),
            accent: colors.violet
        }
    ];

    // === TOP 10 TABLE ===
    const rankedCategories = categories
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    const prevRankMap = {};
    prevCategories
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .forEach((cat, i) => { prevRankMap[cat.id] = i + 1; });

    const tableRows = rankedCategories.map((cat, index) => {
        const currentRank = index + 1;
        const prevRank = prevRankMap[cat.id];
        const prevCat = prevCategories.find(c => c.id === cat.id);
        const prevTotal = prevCat?.total || 0;
        const variation = prevTotal > 0
            ? Math.round(((cat.total - prevTotal) / prevTotal) * 100)
            : 0;
        const percent = totalExpenses > 0 ? Math.round((cat.total / totalExpenses) * 100) : 0;

        let rankChange = '—';
        if (prevRank) {
            if (currentRank < prevRank) rankChange = `▲${prevRank - currentRank}`;
            else if (currentRank > prevRank) rankChange = `▼${currentRank - prevRank}`;
            else rankChange = '=';
        }

        return [
            `#${currentRank}`,
            cat.name,
            `${formatNumber(cat.total)} €`,
            `${percent}%`,
            formatVariation(variation, false),
            rankChange
        ];
    });

    // === INSIGHTS ===
    const insights = generateInsights(data, rankedCategories, expenseVariation, savingsRate);

    // === DOCUMENT DEFINITION ===
    const docDefinition = {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 60],

        // Full dark background
        background: {
            canvas: [
                {
                    type: 'rect',
                    x: 0,
                    y: 0,
                    w: 595.28,  // A4 width in points
                    h: 841.89,  // A4 height in points
                    color: colors.background
                }
            ]
        },

        // Document content
        content: [
            // Header
            createHeader(monthName),

            // Synthèse Section
            createSectionTitle('Synthèse'),
            createBentoRow(summaryCards),

            // Top 10 Section
            createSectionTitle('Top 10 Catégories'),
            createTechTable(
                ['Rang', 'Catégorie', 'Montant', '% Total', 'Variation', 'Évol.'],
                tableRows
            ),

            // Insights Section
            createInsightsSection(insights)
        ].filter(Boolean),

        // Footer
        footer: createFooter(new Date()),

        // Styles
        defaultStyle,
        styles
    };

    // Generate and download
    const fileName = `RoadRich_Rapport_${monthName.replace(' ', '_')}.pdf`;
    pdf.createPdf(docDefinition).download(fileName);
}

// === HELPER FUNCTIONS ===

function formatNumber(amount) {
    const num = Math.round(amount);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatVariation(variation, inverted = false) {
    if (variation === 0) return '—';
    const sign = variation > 0 ? '+' : '';
    return `${sign}${variation}% vs préc.`;
}

function calculateMedianDailyExpense(expenses) {
    if (!expenses || expenses.length === 0) return 0;

    const dailyTotals = {};
    expenses.forEach(exp => {
        const date = exp.date || exp.created_at?.substring(0, 10);
        if (date) {
            dailyTotals[date] = (dailyTotals[date] || 0) + exp.amount;
        }
    });

    const values = Object.values(dailyTotals);
    if (values.length === 0) return 0;

    values.sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);

    if (values.length % 2 === 0) {
        return Math.round((values[mid - 1] + values[mid]) / 2);
    } else {
        return Math.round(values[mid]);
    }
}

function generateInsights(data, rankedCategories, expenseVariation, savingsRate) {
    const insights = [];
    const { totalExpenses, income } = data;

    // Expense trend
    if (expenseVariation < -10) {
        insights.push(`Vos dépenses ont diminué de ${Math.abs(expenseVariation)}% par rapport au mois dernier. Excellent travail ! 🎉`);
    } else if (expenseVariation > 15) {
        insights.push(`Attention : vos dépenses ont augmenté de ${expenseVariation}% ce mois-ci.`);
    }

    // Savings rate
    if (savingsRate >= 20) {
        insights.push(`Taux d'épargne de ${savingsRate}% — vous êtes sur la bonne voie pour vos objectifs financiers.`);
    } else if (savingsRate < 5 && savingsRate >= 0) {
        insights.push(`Votre taux d'épargne est de ${savingsRate}%. Essayez de viser au moins 10% pour constituer un coussin de sécurité.`);
    }

    // Top category
    if (rankedCategories.length > 0) {
        const top = rankedCategories[0];
        const topPercent = totalExpenses > 0 ? Math.round((top.total / totalExpenses) * 100) : 0;
        if (topPercent > 30) {
            insights.push(`${top.name} représente ${topPercent}% de vos dépenses. C'est le poste principal à surveiller.`);
        }
    }

    return insights;
}
