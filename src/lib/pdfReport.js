/**
 * ROADRICH - PDF Report Generator
 * Generates monthly expense reports using jsPDF
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a monthly expense report PDF
 * @param {Object} data - Report data
 * @param {string} data.monthName - Name of the month (e.g., "Janvier 2026")
 * @param {number} data.totalExpenses - Total expenses for the month
 * @param {number} data.prevTotalExpenses - Total expenses for previous month
 * @param {number} data.income - User's monthly income
 * @param {Array} data.categories - Array of category objects with totals
 * @param {Array} data.prevCategories - Previous month categories for comparison
 */
export function generateMonthlyReport(data) {
    const {
        monthName,
        totalExpenses,
        prevTotalExpenses,
        income,
        categories,
        prevCategories
    } = data;

    // Create PDF (A4 format)
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // === HEADER ===
    // Left: App name
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 245, 212); // Cyan accent
    doc.text('RoadRich', margin, yPos);

    // Right: Report title
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Rapport ${monthName}`, pageWidth - margin, yPos, { align: 'right' });

    yPos += 15;

    // Divider line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);

    yPos += 15;

    // === TITLE ===
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(`Rapport ${monthName}`, pageWidth / 2, yPos, { align: 'center' });

    yPos += 20;

    // === SUMMARY SECTION ===
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Résumé du mois', margin, yPos);

    yPos += 10;

    // Calculate variations
    const expenseVariation = prevTotalExpenses > 0
        ? Math.round(((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100)
        : 0;
    const savingsRate = income > 0 ? Math.round(((income - totalExpenses) / income) * 100) : 0;

    // Summary boxes
    const boxWidth = (pageWidth - margin * 2 - 10) / 3;
    const boxHeight = 30;

    // Box 1: Total expenses
    drawSummaryBox(doc, margin, yPos, boxWidth, boxHeight, {
        title: 'Dépenses totales',
        value: formatCurrency(totalExpenses),
        subtitle: getVariationText(expenseVariation, true),
        subtitleColor: expenseVariation <= 0 ? [34, 197, 94] : [239, 68, 68]
    });

    // Box 2: Income
    drawSummaryBox(doc, margin + boxWidth + 5, yPos, boxWidth, boxHeight, {
        title: 'Revenus',
        value: formatCurrency(income),
        subtitle: '',
        subtitleColor: [100, 100, 100]
    });

    // Box 3: Savings rate
    drawSummaryBox(doc, margin + (boxWidth + 5) * 2, yPos, boxWidth, boxHeight, {
        title: 'Taux d\'épargne',
        value: `${savingsRate}%`,
        subtitle: savingsRate >= 20 ? '✓ Objectif atteint' : 'Objectif: 20%',
        subtitleColor: savingsRate >= 20 ? [34, 197, 94] : [100, 100, 100]
    });

    yPos += boxHeight + 20;

    // === TOP 10 CATEGORIES ===
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Top 10 des catégories', margin, yPos);

    yPos += 8;

    // Prepare category data with rankings
    const rankedCategories = categories
        .map(cat => ({
            ...cat,
            total: cat.total || 0
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    // Previous month rankings for comparison
    const prevRankedCategories = prevCategories
        .map(cat => ({
            ...cat,
            total: cat.total || 0
        }))
        .sort((a, b) => b.total - a.total);

    const prevRankMap = {};
    prevRankedCategories.forEach((cat, index) => {
        prevRankMap[cat.id] = index + 1;
    });

    // Build table data
    const tableData = rankedCategories.map((cat, index) => {
        const currentRank = index + 1;
        const prevRank = prevRankMap[cat.id] || '-';
        const prevCat = prevCategories.find(c => c.id === cat.id);
        const prevTotal = prevCat?.total || 0;
        const variation = prevTotal > 0
            ? Math.round(((cat.total - prevTotal) / prevTotal) * 100)
            : (cat.total > 0 ? 100 : 0);

        // Rank evolution
        let rankEvolution = '';
        if (prevRank === '-') {
            rankEvolution = '🆕';
        } else if (currentRank < prevRank) {
            rankEvolution = `↑ ${prevRank - currentRank}`;
        } else if (currentRank > prevRank) {
            rankEvolution = `↓ ${currentRank - prevRank}`;
        } else {
            rankEvolution = '=';
        }

        return [
            `${currentRank}`,
            `${cat.icon} ${cat.name}`,
            formatCurrency(cat.total),
            getVariationText(variation, true),
            rankEvolution
        ];
    });

    // Draw table
    autoTable(doc, {
        startY: yPos,
        head: [['#', 'Catégorie', 'Montant', 'Variation', 'Évolution']],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 10,
            cellPadding: 4
        },
        headStyles: {
            fillColor: [30, 30, 30],
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [245, 245, 245]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            2: { halign: 'right', fontStyle: 'bold' },
            3: { halign: 'center' },
            4: { halign: 'center' }
        },
        didParseCell: function (data) {
            // Color variation column
            if (data.column.index === 3 && data.section === 'body') {
                const text = data.cell.raw;
                if (text.includes('-') || text.includes('↓')) {
                    data.cell.styles.textColor = [34, 197, 94]; // Green
                } else if (text.includes('+') || text.includes('↑')) {
                    data.cell.styles.textColor = [239, 68, 68]; // Red
                }
            }
            // Color rank evolution column
            if (data.column.index === 4 && data.section === 'body') {
                const text = data.cell.raw;
                if (text.includes('↑')) {
                    data.cell.styles.textColor = [239, 68, 68]; // Red (moved up = spent more)
                } else if (text.includes('↓')) {
                    data.cell.styles.textColor = [34, 197, 94]; // Green (moved down = spent less)
                }
            }
        }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // === INSIGHTS SECTION ===
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(50, 50, 50);
    doc.text('Observations', margin, yPos);

    yPos += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);

    const insights = generateInsights(data, rankedCategories, expenseVariation, savingsRate);
    insights.forEach(insight => {
        const lines = doc.splitTextToSize(insight, pageWidth - margin * 2);
        doc.text(lines, margin, yPos);
        yPos += lines.length * 5 + 3;
    });

    // === FOOTER ===
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`Généré par RoadRich le ${new Date().toLocaleDateString('fr-FR')}`, margin, footerY);
    doc.text('roadrich.app', pageWidth - margin, footerY, { align: 'right' });

    // Save the PDF
    const fileName = `rapport_${monthName.toLowerCase().replace(' ', '_')}.pdf`;
    doc.save(fileName);

    return fileName;
}

// === HELPER FUNCTIONS ===

function drawSummaryBox(doc, x, y, width, height, { title, value, subtitle, subtitleColor }) {
    // Background
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(x, y, width, height, 3, 3, 'F');

    // Title
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(title, x + width / 2, y + 8, { align: 'center' });

    // Value
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, x + width / 2, y + 18, { align: 'center' });

    // Subtitle
    if (subtitle) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...subtitleColor);
        doc.text(subtitle, x + width / 2, y + 26, { align: 'center' });
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount);
}

function getVariationText(variation, includeSign = false) {
    if (variation === 0) return '=';
    const sign = variation > 0 ? '+' : '';
    return `${sign}${variation}%`;
}

function generateInsights(data, rankedCategories, expenseVariation, savingsRate) {
    const insights = [];

    // Expense trend
    if (expenseVariation < -10) {
        insights.push(`📉 Excellente maîtrise des dépenses ! Vous avez réduit vos dépenses de ${Math.abs(expenseVariation)}% par rapport au mois précédent.`);
    } else if (expenseVariation > 10) {
        insights.push(`📈 Attention : vos dépenses ont augmenté de ${expenseVariation}% ce mois-ci. Identifiez les postes responsables ci-dessus.`);
    }

    // Savings rate
    if (savingsRate >= 30) {
        insights.push(`💰 Bravo ! Vous épargnez ${savingsRate}% de vos revenus, bien au-dessus de l'objectif recommandé de 20%.`);
    } else if (savingsRate < 10 && savingsRate >= 0) {
        insights.push(`⚠️ Votre taux d'épargne est de ${savingsRate}%. Essayez de viser au moins 10% pour constituer un matelas de sécurité.`);
    }

    // Top spending category
    if (rankedCategories.length > 0) {
        const topCat = rankedCategories[0];
        const topPercent = data.totalExpenses > 0 ? Math.round((topCat.total / data.totalExpenses) * 100) : 0;
        insights.push(`🏆 "${topCat.name}" représente ${topPercent}% de vos dépenses totales (${formatCurrency(topCat.total)}).`);
    }

    // Big movers
    const bigMover = rankedCategories.find(cat => {
        const prevCat = data.prevCategories.find(c => c.id === cat.id);
        if (!prevCat) return false;
        const variation = Math.round(((cat.total - prevCat.total) / prevCat.total) * 100);
        return Math.abs(variation) > 50;
    });

    if (bigMover) {
        const prevCat = data.prevCategories.find(c => c.id === bigMover.id);
        const variation = Math.round(((bigMover.total - prevCat.total) / prevCat.total) * 100);
        if (variation > 0) {
            insights.push(`🔺 Forte augmentation dans "${bigMover.name}" (+${variation}%). Vérifiez si c'est ponctuel ou récurrent.`);
        } else {
            insights.push(`🔻 Belle économie dans "${bigMover.name}" (${variation}%) !`);
        }
    }

    return insights;
}
