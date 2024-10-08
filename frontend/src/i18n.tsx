import {
  Accessor,
  Component,
  createContext,
  createEffect,
  createSignal, getOwner,
  JSX,
  lazy, runWithOwner,
  useContext
} from "solid-js";

import {
  type AvailableLanguageTag, availableLanguageTags,
  onSetLanguageTag,
  setLanguageTag,
  sourceLanguageTag
} from './generated-i18n/runtime';

type Messages = typeof import('./generated-i18n/messages/en');

/** Translation utilities provided by `useI18n()` */
type I18n = {
  /** A signal returning the current language */
  lang: Accessor<AvailableLanguageTag>
  /** Change the current language */
  setLang: (langTag: AvailableLanguageTag) => void
  /** A signal returning the messages in the current language */
  m: Accessor<Messages>
  /** A function that returns a signal returning the translated label of a given zone ID */
  zoneLabel: (zoneId: string) => Accessor<string>
}

const I18nContext = createContext<I18n | undefined>();

/**
 * Access the I18n context from a reactive component.
 * This method must be called from within a reactive component, otherwise it will throw an error.
 */
export const useI18n = (): I18n => {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw 'Initialization error: the I18n context can only be accessed from within a component that is nested in the Localized component'
  } else {
    return context
  }
};

/** A convenient function when you want to access the current messages from
 * a place that is not reactive.
 */
export const usingMessages = (f: (messages: Messages) => string): Accessor<string> => (() => {
  const { m } = useI18n();
  return f(m())
});

// All the languages supported by the UI
// `availableLanguageTags` is automatically generated by the internationalization system
const supportedLangs: Array<AvailableLanguageTag> = availableLanguageTags as unknown as Array<AvailableLanguageTag>;

// WARN: make sure to update this list to keep it consistent with `supportedLangs`
// Also, please keep the list lexicographically ordered by language label
export const supportedLangsAndLabels: Array<[AvailableLanguageTag, string]> = [
  ['de', 'Deutsch'],
  ['en', 'English'],
  ['es', 'Español'],
  ['fr', 'Français'],
  ['it', 'Italiano'],
  ['pl', 'Polski'],
  ['pt', 'Português'],
  ['sk', 'Slovak'],
];

const langKey = 'lang';

function fetchMessages (lang: AvailableLanguageTag): Promise<Messages> {
  return import(`./generated-i18n/messages/${lang}.js`)
    .then(success => success, error => fetchMessages(sourceLanguageTag));
}

type Localized = Component<{ children: JSX.Element }>;

const detectLang = (): AvailableLanguageTag => {
  const isSupported = (candidateLang: string): boolean =>
      supportedLangs.some(lang => lang === candidateLang);

  // 1. Look in the query parameters
  const url = new URL(window.location.toString());
  const initLangFromQuery = url.searchParams.get('lang');
  if (initLangFromQuery !== null && isSupported(initLangFromQuery)) {
    return initLangFromQuery as AvailableLanguageTag
  }

  // 2. Look in the local storage
  const initLangFromLocalStorage = window.localStorage.getItem(langKey);
  if (initLangFromLocalStorage !== null && isSupported(initLangFromLocalStorage)) {
    return initLangFromLocalStorage as AvailableLanguageTag
  }

  // 3. Look in the browser preferences
  if (window.navigator && window.navigator.language && Intl && Intl.Locale) {
    const locale = new Intl.Locale(window.navigator.language);
    if (isSupported(locale.language)) {
      return locale.language as AvailableLanguageTag
    }
  }

  // 4. Fallback to the default lang
  return sourceLanguageTag as AvailableLanguageTag
};

export const Localized: Localized = lazy(() => {
  let initLang = detectLang();
  const owner = getOwner(); // Remember the tracking scope because it is lost when the promise callback is called
  return fetchMessages(initLang).then(initMessages =>
    runWithOwner(owner, () => {
      const [getLang, setLang] = createSignal(initLang);
      const [getMessages, setMessages] = createSignal(initMessages, { equals: false });
      // Sync our signals with the paraglide runtime
      // 1. Update our messages when the language changes
      onSetLanguageTag((tag) => {
        fetchMessages(tag).then(messages => setMessages(messages));
      });
      // 2. Change the language when setLang is called and remember it in the local storage
      createEffect(() => {
        const lang = getLang();
        window.localStorage.setItem(langKey, lang);
        setLanguageTag(lang);
        // Remove the `lang` parameter from the URL to avoid keeping track of the language in the URL
        const url = new URL(window.location.toString());
        url.searchParams.delete('lang');
        window.history.replaceState(null, '', url);
      });
      const value: I18n = {
        lang: getLang,
        setLang: (langTag) => { setLang(langTag) },
        m: getMessages,
        zoneLabel: (zoneId) => {
          // Transform a zone ID such as “central-alps” into
          // a message ID such as “zoneCentralAlps”
          const messageId =
              'zone' +
                zoneId.split("-")
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join('');
          return () => {
            const lookup = (getMessages() as any)[messageId] as (() => string);
            if (lookup === undefined) {
              return zoneId
            } else {
              return lookup()
            }
          }
        }
      };
      return {
        default: (props) =>
          <I18nContext.Provider value={ value }>
            { props.children }
          </I18nContext.Provider>
      };
    }) as { default: Localized }
  );
});
