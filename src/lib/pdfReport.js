/**
 * ROADRICH - PDF Report Generator
 * Generates monthly expense reports using jsPDF
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Generates a monthly expense report PDF - Single Page Layout
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
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // === WATERMARK ===
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.04 }));
    doc.setFontSize(240);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);

    // Center the text (no rotation for clean modern look)
    const watermarkX = pageWidth / 2;
    const watermarkY = pageHeight / 2 + 30;
    doc.text('RR', watermarkX, watermarkY, {
        align: 'center'
    });
    doc.restoreGraphicsState();

    // === HEADER BAR ===
    doc.setFillColor(20, 20, 25);
    doc.rect(0, 0, pageWidth, 28, 'F');

    // App name
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 245, 212);
    doc.text('RoadRich', margin, 18);

    // Report title
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);
    doc.text(`Rapport ${monthName}`, pageWidth - margin, 18, { align: 'right' });

    yPos = 38;

    // === SUMMARY ROW ===
    const expenseVariation = prevTotalExpenses > 0
        ? Math.round(((totalExpenses - prevTotalExpenses) / prevTotalExpenses) * 100)
        : 0;
    const savingsRate = income > 0 ? Math.round(((income - totalExpenses) / income) * 100) : 0;
    const remaining = income - totalExpenses;

    // Draw 3 summary cards in a row
    const cardWidth = (pageWidth - margin * 2 - 8) / 3;
    const cardHeight = 26;

    // Card 1: Expenses vs Income (custom layout)
    drawExpenseCard(doc, margin, yPos, cardWidth, cardHeight, {
        expenses: totalExpenses,
        income: income,
        variation: expenseVariation
    });

    // Card 2: Revenue
    drawCard(doc, margin + cardWidth + 4, yPos, cardWidth, cardHeight, {
        label: 'REVENUS',
        value: formatCurrency(income),
        badge: '',
        badgeColor: [100, 100, 100]
    });

    // Card 3: Remaining / Savings Rate
    drawCard(doc, margin + (cardWidth + 4) * 2, yPos, cardWidth, cardHeight, {
        label: 'ÉPARGNE',
        value: `${savingsRate}%`,
        badge: remaining >= 0 ? formatCurrency(remaining) : formatCurrency(remaining),
        badgeColor: remaining >= 0 ? [34, 197, 94] : [239, 68, 68]
    });

    yPos += cardHeight + 10;

    // === TOP 10 CATEGORIES TABLE ===
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(40, 40, 40);
    doc.text('Top 10 Catégories', margin, yPos);
    yPos += 5;

    // Prepare data
    const rankedCategories = categories
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

    const prevRankMap = {};
    prevCategories
        .filter(c => c.total > 0)
        .sort((a, b) => b.total - a.total)
        .forEach((cat, i) => { prevRankMap[cat.id] = i + 1; });

    const tableData = rankedCategories.map((cat, index) => {
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
            formatCurrency(cat.total),
            `${percent}%`,
            variation === 0 ? '—' : (variation > 0 ? `+${variation}%` : `${variation}%`),
            rankChange
        ];
    });

    // Draw table
    autoTable(doc, {
        startY: yPos,
        head: [['Rang', 'Catégorie', 'Montant', '% Total', 'Variation', 'Évol.']],
        body: tableData,
        margin: { left: margin, right: margin },
        styles: {
            fontSize: 8,
            cellPadding: 2.5,
            overflow: 'linebreak',
            lineColor: [230, 230, 230],
            lineWidth: 0.1
        },
        headStyles: {
            fillColor: [245, 245, 245],
            textColor: [80, 80, 80],
            fontStyle: 'bold',
            fontSize: 7
        },
        bodyStyles: {
            textColor: [50, 50, 50]
        },
        alternateRowStyles: {
            fillColor: [252, 252, 252]
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12, fontStyle: 'bold' },
            1: { cellWidth: 45 },
            2: { halign: 'right', cellWidth: 28, fontStyle: 'bold' },
            3: { halign: 'center', cellWidth: 18 },
            4: { halign: 'center', cellWidth: 20 },
            5: { halign: 'center', cellWidth: 15 }
        },
        didParseCell: function (data) {
            if (data.column.index === 4 && data.section === 'body') {
                const val = data.cell.raw;
                if (val.includes('-')) data.cell.styles.textColor = [34, 197, 94];
                else if (val.includes('+')) data.cell.styles.textColor = [239, 68, 68];
            }
            if (data.column.index === 5 && data.section === 'body') {
                const val = data.cell.raw;
                if (val.includes('▲')) data.cell.styles.textColor = [239, 68, 68];
                else if (val.includes('▼')) data.cell.styles.textColor = [34, 197, 94];
            }
        }
    });

    yPos = doc.lastAutoTable.finalY + 8;

    // === INSIGHTS ===
    const insights = generateInsights(data, rankedCategories, expenseVariation, savingsRate);

    if (insights.length > 0 && yPos < pageHeight - 40) {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(40, 40, 40);
        doc.text('Analyse', margin, yPos);
        yPos += 5;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(70, 70, 70);

        insights.slice(0, 3).forEach(insight => {
            if (yPos < pageHeight - 20) {
                const lines = doc.splitTextToSize(`• ${insight}`, pageWidth - margin * 2);
                doc.text(lines, margin, yPos);
                yPos += lines.length * 3.5 + 2;
            }
        });
    }

    // === FOOTER ===
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, margin, pageHeight - 8);
    doc.text('roadrich.app', pageWidth - margin, pageHeight - 8, { align: 'right' });

    // Save
    const fileName = `rapport_${monthName.toLowerCase().replace(/ /g, '_')}.pdf`;
    doc.save(fileName);
    return fileName;
}

// === HELPERS ===

function drawCard(doc, x, y, width, height, { label, value, badge, badgeColor }) {
    // Background
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(label, x + width / 2, y + 6, { align: 'center' });

    // Value
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(value, x + width / 2, y + 14, { align: 'center' });

    // Badge
    if (badge) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...badgeColor);
        doc.text(badge, x + width / 2, y + 20, { align: 'center' });
    }
}

function drawExpenseCard(doc, x, y, width, height, { expenses, income, variation }) {
    // Background
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(x, y, width, height, 2, 2, 'F');

    // Label
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text('DÉPENSES', x + width / 2, y + 6, { align: 'center' });

    // Expenses amount (larger, bold, black)
    const expenseStr = formatNumber(expenses);
    const incomeStr = formatCurrencyShort(income);
    const fullText = `${expenseStr} sur ${incomeStr}`;

    // Calculate text widths for positioning
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    const expenseWidth = doc.getTextWidth(expenseStr);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const surWidth = doc.getTextWidth(' sur ');
    const incomeWidth = doc.getTextWidth(incomeStr);

    const totalWidth = expenseWidth + surWidth + incomeWidth;
    const startX = x + (width - totalWidth) / 2;

    // Draw expense amount (bold, black)
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    doc.text(expenseStr, startX, y + 14);

    // Draw " sur " (gray)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(130, 130, 130);
    doc.text(' sur ', startX + expenseWidth, y + 14);

    // Draw income (gray)
    doc.text(incomeStr, startX + expenseWidth + surWidth, y + 14);

    // Variation badge (colored)
    if (variation !== 0) {
        const sign = variation > 0 ? '+' : '';
        const badgeText = `${sign}${variation}% vs préc.`;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        if (variation <= 0) {
            doc.setTextColor(34, 197, 94); // Green
        } else {
            doc.setTextColor(239, 68, 68); // Red
        }
        doc.text(badgeText, x + width / 2, y + 21, { align: 'center' });
    }
}

function formatNumber(amount) {
    const num = Math.round(amount);
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function formatCurrencyShort(amount) {
    const num = Math.round(amount);
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} €`;
}

function formatCurrency(amount) {
    // Manual formatting to avoid encoding issues in PDF
    const num = Math.round(amount);
    const formatted = num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${formatted} €`;
}

function getVariationBadge(variation, inverse = false) {
    if (variation === 0) return '—';
    const sign = variation > 0 ? '+' : '';
    return `${sign}${variation}% vs mois préc.`;
}

function generateInsights(data, rankedCategories, expenseVariation, savingsRate) {
    const insights = [];

    if (expenseVariation < -10) {
        insights.push(`Excellente maîtrise ! Dépenses réduites de ${Math.abs(expenseVariation)}% par rapport au mois précédent.`);
    } else if (expenseVariation > 15) {
        insights.push(`Attention : vos dépenses ont augmenté de ${expenseVariation}% ce mois-ci.`);
    }

    if (savingsRate >= 25) {
        insights.push(`Excellent taux d'épargne de ${savingsRate}%, bien au-dessus de l'objectif de 20%.`);
    } else if (savingsRate < 5 && savingsRate >= 0) {
        insights.push(`Taux d'épargne faible (${savingsRate}%). Objectif recommandé : 10-20%.`);
    }

    if (rankedCategories.length > 0) {
        const top = rankedCategories[0];
        const pct = data.totalExpenses > 0 ? Math.round((top.total / data.totalExpenses) * 100) : 0;
        insights.push(`"${top.name}" représente ${pct}% du total (${formatCurrency(top.total)}).`);
    }

    return insights;
}
