/**
 * RoadRich PDF Components - Reusable UI Elements
 * Creates pdfmake-compatible definition objects
 */

import { colors, styles } from './pdfTheme.js';

/**
 * Creates the document header with vectorial "RR" logo
 * @param {string} monthName - e.g. "Janvier 2026"
 * @returns {object} pdfmake content object
 */
export function createHeader(monthName) {
    return {
        columns: [
            // Logo "RR" vectoriel (canvas)
            {
                canvas: [
                    // Background circle
                    {
                        type: 'ellipse',
                        x: 15,
                        y: 15,
                        r1: 15,
                        r2: 15,
                        color: colors.cyan
                    }
                ],
                width: 35
            },
            // App Name
            {
                text: 'RoadRich',
                style: 'header',
                margin: [5, 5, 0, 0]
            },
            // Report Title (Right aligned)
            {
                text: `Rapport ${monthName}`,
                style: 'subheader',
                alignment: 'right',
                margin: [0, 7, 0, 0]
            }
        ],
        margin: [0, 0, 0, 20]
    };
}

/**
 * Creates a section title with cyan accent
 * @param {string} title - Section title text
 * @returns {object} pdfmake content object
 */
export function createSectionTitle(title) {
    return {
        columns: [
            // Cyan accent bar
            {
                canvas: [
                    {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w: 3,
                        h: 12,
                        color: colors.cyan
                    }
                ],
                width: 8
            },
            // Title text
            {
                text: title.toUpperCase(),
                style: 'sectionTitle',
                margin: [0, 0, 0, 0]
            }
        ],
        margin: [0, 15, 0, 10]
    };
}

/**
 * Creates a Bento-style KPI card with background and accent border
 * @param {string} title - Card label
 * @param {string} value - Main KPI value
 * @param {string} subtitle - Secondary text (variation, %)
 * @param {string} accentColor - Border color (default: cyan)
 * @returns {object} pdfmake content object
 */
export function createBentoCard(title, value, subtitle = '', accentColor = colors.cyan) {
    const cardWidth = 170;
    const cardHeight = 60;

    return {
        stack: [
            // Background canvas
            {
                canvas: [
                    // Card background
                    {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w: cardWidth,
                        h: cardHeight,
                        r: 6,
                        color: colors.surface
                    },
                    // Accent top border
                    {
                        type: 'rect',
                        x: 0,
                        y: 0,
                        w: cardWidth,
                        h: 3,
                        color: accentColor
                    }
                ]
            },
            // Card content (overlaid on canvas)
            {
                stack: [
                    { text: title, style: 'kpiLabel' },
                    { text: value, style: 'kpiValue', margin: [0, 4, 0, 2] },
                    { text: subtitle, style: 'kpiSubvalue' }
                ],
                margin: [0, -50, 0, 0],  // Overlay on canvas
                alignment: 'center'
            }
        ],
        width: cardWidth
    };
}

/**
 * Creates a row of 3 Bento cards
 * @param {Array} cards - Array of card config objects {title, value, subtitle, accent}
 * @returns {object} pdfmake columns object
 */
export function createBentoRow(cards) {
    return {
        columns: cards.map(card =>
            createBentoCard(card.title, card.value, card.subtitle, card.accent || colors.cyan)
        ),
        columnGap: 20,
        alignment: 'center',
        margin: [0, 0, 0, 15]
    };
}

/**
 * Creates a minimalist "Terminal" style table
 * @param {Array} headers - Column headers
 * @param {Array} rows - Table data rows
 * @returns {object} pdfmake table object
 */
export function createTechTable(headers, rows) {
    // Style header row
    const styledHeaders = headers.map(h => ({
        text: h.toUpperCase(),
        style: 'tableHeader',
        alignment: 'center'
    }));

    // Style body rows with conditional coloring
    const styledRows = rows.map(row =>
        row.map((cell, index) => {
            let cellStyle = 'tableCell';
            let textColor = colors.textPrimary;

            // Variation column (index 4)
            if (index === 4) {
                if (String(cell).includes('-')) textColor = colors.cyanBright;
                else if (String(cell).includes('+')) textColor = colors.red;
            }
            // Evolution column (index 5)
            if (index === 5) {
                if (String(cell).includes('▲')) textColor = colors.red;
                else if (String(cell).includes('▼')) textColor = colors.cyanBright;
            }
            // Muted columns (% Total)
            if (index === 3) textColor = colors.textSecondary;

            return {
                text: String(cell),
                color: textColor,
                alignment: index === 1 ? 'left' : 'center'
            };
        })
    );

    return {
        table: {
            headerRows: 1,
            widths: [35, '*', 55, 40, 45, 35],
            body: [styledHeaders, ...styledRows]
        },
        layout: {
            hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.5 : 0.2,
            vLineWidth: () => 0,
            hLineColor: () => colors.tableLine,
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 5,
            paddingBottom: () => 5,
            fillColor: (rowIndex) => rowIndex === 0 ? colors.tableHeader : (rowIndex % 2 === 0 ? colors.surface : colors.surfaceLight)
        },
        margin: [0, 0, 0, 15]
    };
}

/**
 * Creates the insights/analysis section
 * @param {Array} insights - Array of insight strings
 * @returns {object} pdfmake content object
 */
export function createInsightsSection(insights) {
    if (!insights || insights.length === 0) return null;

    return {
        stack: [
            createSectionTitle('Analyse'),
            ...insights.slice(0, 3).map(insight => ({
                text: `• ${insight}`,
                style: 'tableCell',
                margin: [10, 0, 0, 5]
            }))
        ]
    };
}

/**
 * Creates the document footer
 * @param {Date} generatedDate
 * @returns {object} pdfmake footer function
 */
export function createFooter(generatedDate) {
    const dateStr = generatedDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    return (currentPage, pageCount) => ({
        columns: [
            { text: `Généré le ${dateStr}`, style: 'footer' },
            { text: 'roadrich.app', style: 'footer', alignment: 'right' }
        ],
        margin: [40, 0, 40, 0]
    });
}
