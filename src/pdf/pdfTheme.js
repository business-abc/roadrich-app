/**
 * RoadRich PDF Theme - Color Palette & Typography
 * Premium Dark Mode Design System
 */

// === COLOR PALETTE ===
export const colors = {
    // Backgrounds
    background: '#121212',      // Page background (Deep Anthracite)
    surface: '#1E1E1E',         // Card/Bento backgrounds
    surfaceLight: '#2A2A2A',    // Alternate rows, hover states

    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#888888',
    textMuted: '#555555',

    // Accent Colors
    cyan: '#00BBF9',            // Primary accent (KPIs, borders)
    cyanBright: '#00F5D4',      // Positive variations
    gold: '#FFD700',            // Savings/Épargne
    red: '#FF4757',             // Negative variations
    violet: '#9B5DE5',          // Tertiary accent

    // Table
    tableLine: '#333333',       // Horizontal separators
    tableHeader: '#1A1A1A'      // Header row background
};

// === TYPOGRAPHY STYLES ===
export const defaultStyle = {
    font: 'Roboto',
    fontSize: 10,
    color: colors.textPrimary,
    lineHeight: 1.3
};

export const styles = {
    // Headers
    header: {
        fontSize: 18,
        bold: true,
        color: colors.cyan
    },
    subheader: {
        fontSize: 14,
        bold: true,
        color: colors.textPrimary
    },
    sectionTitle: {
        fontSize: 11,
        bold: true,
        color: colors.textSecondary,
        margin: [0, 15, 0, 8]
    },

    // KPI Cards
    kpiLabel: {
        fontSize: 8,
        color: colors.textSecondary,
        alignment: 'center'
    },
    kpiValue: {
        fontSize: 16,
        bold: true,
        color: colors.textPrimary,
        alignment: 'center'
    },
    kpiSubvalue: {
        fontSize: 9,
        color: colors.textMuted,
        alignment: 'center'
    },

    // Table
    tableHeader: {
        fontSize: 8,
        bold: true,
        color: colors.cyan,
        fillColor: colors.tableHeader
    },
    tableCell: {
        fontSize: 9,
        color: colors.textPrimary
    },
    tableCellMuted: {
        fontSize: 9,
        color: colors.textSecondary
    },

    // Variations
    positive: {
        color: colors.cyanBright
    },
    negative: {
        color: colors.red
    },

    // Footer
    footer: {
        fontSize: 7,
        color: colors.textMuted,
        alignment: 'center'
    }
};

// === TABLE LAYOUT (Terminal Style) ===
export const terminalTableLayout = {
    hLineWidth: (i, node) => (i === 0 || i === 1 || i === node.table.body.length) ? 0.5 : 0.3,
    vLineWidth: () => 0,
    hLineColor: () => colors.tableLine,
    paddingLeft: () => 8,
    paddingRight: () => 8,
    paddingTop: () => 6,
    paddingBottom: () => 6,
    fillColor: (rowIndex) => rowIndex === 0 ? colors.tableHeader : (rowIndex % 2 === 0 ? colors.surface : colors.surfaceLight)
};
