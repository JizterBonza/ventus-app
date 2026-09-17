import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { HomepageContent, HomepageSlide, HomepageEditorVerificationRequired, defaultHomepageContent, fetchHomepageForEditor, requestHomepageEditorCode, saveHomepageContent, uploadHomepageImage, verifyHomepageEditorCode } from '../utils/homepageContent';
import { InterestCategory } from '../types/interests';
import './HomepageEditor.css';

type Section = 'slider' | 'cards';

const HomepageEditor: React.FC = () => {
  const [content, setContent] = useState<HomepageContent>(defaultHomepageContent);
  const [version, setVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchHomepageForEditor().then(({ content: loaded, version: loadedVersion }) => {
      if (!active) return;
      setContent(loaded);
      setVersion(loadedVersion);
      setLoading(false);
    }).catch((reason) => {
      if (!active) return;
      if (reason instanceof HomepageEditorVerificationRequired) setVerificationRequired(true);
      else setError(reason instanceof Error ? reason.message : 'Unable to load the editor');
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const sendVerificationCode = async () => {
    setSendingCode(true);
    setError('');
    setNotice('');
    try {
      await requestHomepageEditorCode();
      setNotice('A verification code has been sent to your Ventus account email.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const verifyEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setVerifyingCode(true);
    setError('');
    try {
      await verifyHomepageEditorCode(verificationCode);
      const loaded = await fetchHomepageForEditor();
      setContent(loaded.content);
      setVersion(loaded.version);
      setVerificationRequired(false);
      setVerificationCode('');
      setNotice('Email verified. You can now edit the homepage.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to verify your email');
    } finally {
      setVerifyingCode(false);
    }
  };

  const updateItem = (section: Section, index: number, field: string, value: string) => {
    setContent((current) => ({
      ...current,
      [section]: current[section].map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item),
    }));
    setDirty(true);
    setNotice('');
  };

  const moveItem = (section: Section, index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= content[section].length) return;
    setContent((current) => {
      const items = [...current[section]];
      [items[index], items[nextIndex]] = [items[nextIndex], items[index]];
      return { ...current, [section]: items };
    });
    setDirty(true);
  };

  const removeItem = (section: Section, index: number) => {
    if (content[section].length <= 1) return;
    setContent((current) => section === 'slider'
      ? { ...current, slider: current.slider.filter((_, itemIndex) => itemIndex !== index) }
      : { ...current, cards: current.cards.filter((_, itemIndex) => itemIndex !== index) });
    setDirty(true);
  };

  const addItem = (section: Section) => {
    const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    if (section === 'slider') {
      const item: HomepageSlide = {
        id, title: 'New featured hotel', subtitle: 'Destination',
        image: '/assets/img/featured/passalacqua.webp', href: '/hotel/11063',
      };
      setContent((current) => ({ ...current, slider: [...current.slider, item] }));
    } else {
      const item: InterestCategory = {
        id, title: 'New inspiration', description: 'Add a short description.',
        image: '/assets/img/interests/citybreaks.webp', href: '/search-results?location=London',
        categories: [], location: 'Worldwide',
      };
      setContent((current) => ({ ...current, cards: [...current.cards, item] }));
    }
    setDirty(true);
  };

  const uploadImage = async (section: Section, index: number, file?: File) => {
    if (!file) return;
    const key = `${section}-${index}`;
    setUploading(key);
    setError('');
    try {
      const image = await uploadHomepageImage(file);
      updateItem(section, index, 'image', image);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Image upload failed');
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    if (version === null) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = await saveHomepageContent(content, version);
      setContent(saved.content);
      setVersion(saved.version);
      setDirty(false);
      setNotice('Homepage saved. Visitors will see the update shortly.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the homepage');
    } finally {
      setSaving(false);
    }
  };

  const renderItems = (section: Section) => content[section].map((item, index) => (
    <article className="homepage-editor-item" key={item.id}>
      <div className="homepage-editor-item-top">
        <span>{section === 'slider' ? 'Slide' : 'Card'} {index + 1}</span>
        <div className="homepage-editor-actions">
          <button type="button" onClick={() => moveItem(section, index, -1)} disabled={index === 0} aria-label={`Move ${item.title} up`}>↑</button>
          <button type="button" onClick={() => moveItem(section, index, 1)} disabled={index === content[section].length - 1} aria-label={`Move ${item.title} down`}>↓</button>
          <button type="button" onClick={() => removeItem(section, index)} disabled={content[section].length <= 1}>Remove</button>
        </div>
      </div>
      <div className="homepage-editor-item-grid">
        <div className="homepage-editor-image">
          <img src={item.image} alt="Current card preview" />
          <label>
            Upload replacement image
            <input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading !== null} onChange={(event) => {
              void uploadImage(section, index, event.target.files?.[0]);
              event.target.value = '';
            }} />
          </label>
          {uploading === `${section}-${index}` && <small>Uploading…</small>}
          <small>JPEG, PNG, or WebP · maximum 4 MB</small>
        </div>
        <div className="homepage-editor-fields">
          <label>Title<input type="text" maxLength={120} value={item.title} onChange={(event) => updateItem(section, index, 'title', event.target.value)} /></label>
          <label>{section === 'slider' ? 'Location / subtitle' : 'Description'}
            <input type="text" maxLength={section === 'slider' ? 160 : 240} value={section === 'slider' ? (item as HomepageSlide).subtitle : (item as InterestCategory).description} onChange={(event) => updateItem(section, index, section === 'slider' ? 'subtitle' : 'description', event.target.value)} />
          </label>
          <label>Link<input type="text" maxLength={2048} value={item.href || ''} onChange={(event) => updateItem(section, index, 'href', event.target.value)} placeholder="/search-results?location=London" /></label>
          <label>Image URL<input type="text" maxLength={2048} value={item.image} onChange={(event) => updateItem(section, index, 'image', event.target.value)} placeholder="https://… or /assets/…" /></label>
        </div>
      </div>
    </article>
  ));

  return (
    <Layout>
      <section className="homepage-editor container">
        <div className="homepage-editor-heading">
          <div><p className="homepage-editor-eyebrow">VENTUS CONTENT</p><h1>Homepage editor</h1><p>Edit the featured slider and inspiration cards. Changes publish when you save.</p></div>
          <Link to="/" target="_blank" rel="noopener noreferrer">Preview homepage ↗</Link>
        </div>
        {loading ? <p role="status">Loading homepage content…</p> : verificationRequired ? (
          <div className="homepage-editor-verification">
            <h2>Verify your account email</h2>
            <p>Before editing the homepage, confirm that you own the email address on your Ventus account. We’ll send a one-time code there.</p>
            {error && <div className="alert alert-danger" role="alert">{error}</div>}
            {notice && <div className="alert alert-success" role="status">{notice}</div>}
            <button type="button" onClick={() => void sendVerificationCode()} disabled={sendingCode}>{sendingCode ? 'Sending…' : 'Send verification code'}</button>
            <form onSubmit={(event) => void verifyEmail(event)}>
              <label htmlFor="homepage-editor-code">12-character code from your email</label>
              <input id="homepage-editor-code" type="text" inputMode="text" autoComplete="one-time-code" maxLength={12} value={verificationCode} onChange={(event) => setVerificationCode(event.target.value.toUpperCase())} />
              <button type="submit" disabled={verifyingCode || verificationCode.trim().length !== 12}>{verifyingCode ? 'Verifying…' : 'Verify and open editor'}</button>
            </form>
          </div>
        ) : version === null ? (
          <div className="alert alert-danger" role="alert">{error || 'You do not have access to this editor.'}</div>
        ) : <>
          {error && <div className="alert alert-danger" role="alert">{error}</div>}
          {notice && <div className="alert alert-success" role="status">{notice}</div>}
          <div className="homepage-editor-toolbar">
            <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
            <button type="button" onClick={() => void save()} disabled={!dirty || saving || uploading !== null}>{saving ? 'Saving…' : 'Save homepage'}</button>
          </div>
          <section aria-labelledby="homepage-slides-title"><div className="homepage-editor-section-heading"><div><h2 id="homepage-slides-title">Featured slider</h2><p>These appear in Ventus’ Picks, in this order.</p></div><button type="button" onClick={() => addItem('slider')}>Add slide</button></div>{renderItems('slider')}</section>
          <section aria-labelledby="homepage-cards-title"><div className="homepage-editor-section-heading"><div><h2 id="homepage-cards-title">Inspiration cards</h2><p>Use an internal path beginning with / or a full https:// link.</p></div><button type="button" onClick={() => addItem('cards')}>Add card</button></div>{renderItems('cards')}</section>
          <div className="homepage-editor-toolbar homepage-editor-bottom"><span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span><button type="button" onClick={() => void save()} disabled={!dirty || saving || uploading !== null}>{saving ? 'Saving…' : 'Save homepage'}</button></div>
        </>}
      </section>
    </Layout>
  );
};

export default HomepageEditor;
