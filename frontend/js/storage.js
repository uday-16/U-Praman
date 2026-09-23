/**
 * PRAMAN LocalStorage Manager
 * Handles local caching and persistence for requirement analysis,
 * saved standards, search history, location, language, and accessibility preferences.
 */

export const PRAMANStorage = {
  // Requirement Analysis Storage
  getRequirements() {
    try {
      return JSON.parse(localStorage.getItem('praman_requirements') || '[]');
    } catch {
      return [];
    }
  },
  
  saveRequirement(requirement) {
    const requirements = this.getRequirements();
    const newReq = {
      id: 'REQ-' + Date.now().toString().slice(-6),
      title: requirement.title || 'Procurement Requirement',
      text: requirement.text || '',
      category: requirement.category || 'General Procurement',
      state: requirement.state || 'All India',
      date: new Date().toISOString().split('T')[0],
      parameters: requirement.parameters || [],
      matchedStandards: requirement.matchedStandards || []
    };
    requirements.unshift(newReq);
    localStorage.setItem('praman_requirements', JSON.stringify(requirements));
    localStorage.setItem('praman_current_analysis', JSON.stringify(newReq));
    return newReq;
  },

  getCurrentAnalysis() {
    try {
      return JSON.parse(localStorage.getItem('praman_current_analysis') || 'null');
    } catch {
      return null;
    }
  },

  // Saved / Bookmarked Standards
  getSavedStandards() {
    try {
      return JSON.parse(localStorage.getItem('praman_saved_standards') || '[]');
    } catch {
      return [];
    }
  },

  toggleSaveStandard(standardId) {
    const saved = this.getSavedStandards();
    const index = saved.indexOf(standardId);
    if (index > -1) {
      saved.splice(index, 1);
    } else {
      saved.push(standardId);
    }
    localStorage.setItem('praman_saved_standards', JSON.stringify(saved));
    return saved.includes(standardId);
  },

  isStandardSaved(standardId) {
    return this.getSavedStandards().includes(standardId);
  },

  // Location Selector Preference
  getSelectedState() {
    return localStorage.getItem('praman_selected_state') || 'All India';
  },

  setSelectedState(stateName) {
    localStorage.setItem('praman_selected_state', stateName);
  },

  // Language Preference
  getLanguage() {
    return localStorage.getItem('praman_lang') || 'en';
  },

  setLanguage(langCode) {
    localStorage.setItem('praman_lang', langCode);
  },

  // Font Size Preference
  getFontSize() {
    return localStorage.getItem('praman_font_size') || '100%';
  },

  setFontSize(sizePercent) {
    localStorage.setItem('praman_font_size', sizePercent);
  },

  // High Contrast Preference
  getHighContrast() {
    return localStorage.getItem('praman_high_contrast') === 'true';
  },

  setHighContrast(isHighContrast) {
    localStorage.setItem('praman_high_contrast', isHighContrast ? 'true' : 'false');
  }
};
