window.AAPPApp = function AAPPApp() {
  return {
    ...window.AAPPState(),
    ...window.AAPPUtils,
    ...window.AAPPCore,
    ...window.AAPPFilters,
    ...window.AAPPRelations,
    ...window.AAPPReports,
    ...window.AAPPBulk,
    ...window.AAPPCrud,
    ...window.AAPPSeeds
  };
};
