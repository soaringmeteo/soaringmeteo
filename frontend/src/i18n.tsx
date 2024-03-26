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

const availableLangs: Array<AvailableLanguageTag> = availableLanguageTags as unknown as Array<AvailableLanguageTag>;

// WARN: make sure to update this list to keep it consistent with `availableLangs`
export const availableLangsAndLabels: Array<[AvailableLanguageTag, string]> = [
  ['de', 'Deutsch'],
  ['en', 'English'],
  ['fr', 'Français'],
  ['it', 'Italiano']
];

const langKey = 'lang';

function fetchMessages (lang: AvailableLanguageTag): Promise<Messages> {
  return import(`./generated-i18n/messages/${lang}.js`)
    .then(success => success, error => fetchMessages(sourceLanguageTag));
}

type Localized = Component<{ children: JSX.Element }>;

const detectLang = (): AvailableLanguageTag => {
  // 1. Look in the local storage
  const initLangFromLocalStorage = window.localStorage.getItem(langKey);
  if (initLangFromLocalStorage !== null && availableLangs.some(lang => lang === initLangFromLocalStorage)) {
    return initLangFromLocalStorage as AvailableLanguageTag
  }

  // 2. Look in the browser preferences
  if (window.navigator && window.navigator.language && Intl && Intl.Locale) {
    const locale = new Intl.Locale(window.navigator.language);
    if (availableLangs.some(lang => lang === locale.language)) {
      return locale.language as AvailableLanguageTag
    }
  }

  // 3. Fallback to the default lang
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
