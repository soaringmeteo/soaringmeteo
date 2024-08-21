import {type ModelName} from "./data/Model";

/** Wrapper around the plausible-tracker package that loads it in the background */
export class Plausible {

  private plausible;

  constructor() {
    // Load the plausible-tracker module in the background to not block the users
    this.plausible =
      import('plausible-tracker').then(module =>
        module.default({
          domain: 'soaringmeteo.org',
          apiHost: 'https://plausible.soaringmeteo.org',
          // trackLocalhost: true // For development only
        })
      );
  }

  /** Register a “page view” event and attach the provided Model to it */
  trackPageView(model: ModelName): void {
    this.plausible.then(plausible => {
      plausible.trackPageview({}, { props: { model } })
    });
  }

}

