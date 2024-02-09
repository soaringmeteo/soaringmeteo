import {Accessor, Component, createContext, createEffect, createSignal, JSX, useContext} from "solid-js";
import * as messages from './generated-i18n/messages';
import {
  type AvailableLanguageTag, availableLanguageTags,
  languageTag,
  onSetLanguageTag,
  setLanguageTag,
  sourceLanguageTag
} from './generated-i18n/runtime';

type I18n = {
  lang: Accessor<AvailableLanguageTag>
  setLang: (langTag: AvailableLanguageTag) => void
  m: Accessor<typeof messages>
}

const I18nContext = createContext<I18n>({
  lang: languageTag,
  setLang: () => {},
  m: () => messages
});

export const useI18n = () => useContext(I18nContext);

export const availableLangs: Array<AvailableLanguageTag> = availableLanguageTags as unknown as Array<AvailableLanguageTag>;

export const Localized: Component<{ children: JSX.Element }> = (props) => {
  const [getMessages, setMessages] = createSignal(messages, { equals: false });
  const [getLang, setLang] = createSignal(sourceLanguageTag as AvailableLanguageTag /* TODO detect from local storage and navigator */);
  // Sync our signals with the paraglide runtime
  createEffect(() => {
    setLanguageTag(getLang());
  });
  onSetLanguageTag(() => {
    setMessages(messages);
  })
  const value: I18n = {
    lang: getLang,
    setLang: (langTag) => { setLang(langTag) },
    m: getMessages
  };
  return <I18nContext.Provider value={ value }>
    { props.children }
  </I18nContext.Provider>
};
