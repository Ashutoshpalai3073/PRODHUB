// Shared flight state between StageVoyage (writer) and PathwayCosmos (reader):
// how far through the stage voyage the viewer has flown, 0..1. Lets the
// background camera approach the planet while the stage cards are scrolled —
// one shared journey instead of two disconnected animations.
export const voyage = { progress: 0 };
