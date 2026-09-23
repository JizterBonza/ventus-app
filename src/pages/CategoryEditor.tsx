import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import HotelPicker from '../components/shared/HotelPicker';
import EditorEmailVerification from '../components/shared/EditorEmailVerification';
import { CategoryContent, CategoryPage, categoryPath, categorySlug, fetchCategories, saveCategory } from '../utils/categoryPages';
import { HomepageEditorVerificationRequired, uploadHomepageImage } from '../utils/homepageContent';
import { useAuth } from '../contexts/AuthContext';
import { CategoryDraft, clearCategoryDraft, readCategoryDraft, writeCategoryDraft } from '../utils/categoryDrafts';
import './HomepageEditor.css';
import './CategoryEditor.css';

const emptyCategory = (): CategoryContent => ({ title: '', slug: '', description: '', image: '', hotels: [], published: false, showOnHomepage: true });

const CategoryEditor: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const draftKey = `ventus:category-draft:${user?.id}:${id || 'list'}`;
  const session = useRef(0);
  const loadedDraftKey = useRef<string | null>(null);
  const [recovery, setRecovery] = useState<CategoryDraft | null>(null);
  const [pages, setPages] = useState<CategoryPage[]>([]);
  const [content, setContent] = useState<CategoryContent>(emptyCategory);
  const [existing, setExisting] = useState<CategoryPage>();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [verification, setVerification] = useState(false);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    let active = true;
    session.current += 1;
    loadedDraftKey.current = null;
    setRecovery(null); setDirty(false); setBusy(false);
    setLoading(true); setError(''); setAllowed(false); setVerification(false);
    void fetchCategories(true).then((categories) => {
      if (!active) return;
      setPages(categories); setAllowed(true);
      const selected = categories.find((page) => page.id === id);
      loadedDraftKey.current = draftKey;
      setExisting(selected); setContent(selected || emptyCategory()); setDirty(false); setSlugEdited(Boolean(selected));
      if (id === 'new' || selected) setRecovery(readCategoryDraft(draftKey));
      if (id && id !== 'new' && !selected) setError('Category page not found. Choose a page or create a new one.');
    }).catch((reason) => {
      if (!active) return;
      if (reason instanceof HomepageEditorVerificationRequired) setVerification(true);
      else setError(reason instanceof Error ? reason.message : 'Unable to load category pages');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; session.current += 1; };
  }, [id, reload, draftKey]);
  useEffect(() => {
    if (dirty && !loading && loadedDraftKey.current === draftKey) writeCategoryDraft(draftKey, { content, existing });
  }, [dirty, loading, content, existing, draftKey]);
  useEffect(() => {
    if (!dirty && !busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const guard = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || anchor.href === window.location.href) return;
      if (busy || !window.confirm('Leave this page with unsaved changes? You can restore them when you return in this tab.')) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', guard, true);
    return () => { window.removeEventListener('beforeunload', warn); document.removeEventListener('click', guard, true); };
  }, [dirty, busy]);
  const update = (changes: Partial<CategoryContent>) => {
    setContent((current) => ({ ...current, ...changes })); setDirty(true); setNotice('');
  };
  const moveHotel = (index: number, direction: -1 | 1) => {
    const hotels = [...content.hotels];
    [hotels[index], hotels[index + direction]] = [hotels[index + direction], hotels[index]];
    update({ hotels });
  };
  const choosePage = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (busy) event.preventDefault();
    else setNotice('');
  };
  const upload = async (file?: File) => {
    if (!file) return;
    const currentSession = session.current;
    setBusy(true); setError('');
    try { const image = await uploadHomepageImage(file); if (session.current === currentSession) update({ image }); }
    catch (reason) { if (session.current === currentSession) setError(reason instanceof Error ? reason.message : 'Image upload failed'); }
    finally { if (session.current === currentSession) setBusy(false); }
  };
  const save = async (event: React.FormEvent) => {
    if (busy || recovery) { event.preventDefault(); return; }
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const currentSession = session.current;
    try {
      const saved = await saveCategory(content, existing);
      clearCategoryDraft(draftKey);
      if (session.current !== currentSession) return;
      setExisting(saved); setContent(saved); setDirty(false);
      setPages((current) => [saved, ...current.filter((page) => page.id !== saved.id)]);
      setNotice(saved.published ? 'Category published. Visitors can now view it.' : 'Draft saved. This page is hidden from visitors.');
      if (!existing) navigate(`/admin/categories/${saved.id}`, { replace: true });
    } catch (reason) { if (session.current === currentSession) setError(reason instanceof Error ? reason.message : 'Unable to save category'); }
    finally { if (session.current === currentSession) setBusy(false); }
  };

  return <Layout><section className="homepage-editor category-editor container">
    <div className="homepage-editor-heading">
      <div><p className="homepage-editor-eyebrow">VENTUS CONTENT</p><h1>Category pages</h1><p>Create collections of hotels and feature them on the homepage.</p></div>
      <Link to="/admin/categories/new" onClick={choosePage}>+ New category</Link>
    </div>
    {loading ? <p role="status">Loading category pages…</p> : verification ? <EditorEmailVerification onVerified={() => setReload((value) => value + 1)} /> : <>
      {error && <div className="alert alert-danger" role="alert">{error} <button type="button" disabled={busy} onClick={() => {
        if (!dirty || window.confirm('Discard unsaved changes and reload?')) { clearCategoryDraft(draftKey); setReload((value) => value + 1); }
      }}>Reload</button></div>}
      {notice && <div className="alert alert-success" role="status">{notice}</div>}
      {recovery && <div className="alert alert-warning category-draft-recovery" role="status">
        <p>This tab has unsaved changes for this category.</p>
        <button type="button" onClick={() => {
          setContent(recovery.content); setExisting(recovery.existing); setSlugEdited(true); setDirty(true); setRecovery(null);
          if (existing && recovery.existing?.version !== existing.version) setError('This page has also changed on the server. Your restored changes use the earlier version; copy any edits you need before reloading.');
        }}>Restore unsaved changes</button>
        <button type="button" onClick={() => { clearCategoryDraft(draftKey); setRecovery(null); }}>Discard saved changes</button>
      </div>}
      {allowed && <div className="category-editor-layout">
        <aside className="category-page-list" aria-label="Category pages">
          <h2>Your pages</h2>
          {!pages.length && <p>No pages yet. Create your first collection.</p>}
          {pages.map((page) => <Link key={page.id} to={`/admin/categories/${page.id}`} onClick={choosePage} aria-current={id === page.id ? 'page' : undefined}>
            <strong>{page.title}</strong><small>{page.published ? 'Published' : 'Draft'} · {page.hotels.length} hotels{page.published && page.showOnHomepage ? ' · Homepage' : ''}</small>
          </Link>)}
        </aside>
        {id && (id === 'new' || existing) ? <form onSubmit={(event) => void save(event)} className="category-page-form">
          <div className="homepage-editor-toolbar">
            <span>{dirty ? 'Unsaved changes' : existing ? 'All changes saved' : 'New category'}</span>
            <button type="submit" disabled={busy || Boolean(recovery) || (!dirty && Boolean(existing))}>{busy ? 'Please wait…' : content.published ? 'Save and publish' : 'Save draft'}</button>
          </div>
          <fieldset disabled={busy || Boolean(recovery)}>
            <legend className="visually-hidden">Category details</legend>
            <div className="homepage-editor-fields">
              <label>Page title<input required maxLength={120} value={content.title} onChange={(event) => update({ title: event.target.value, ...(!slugEdited ? { slug: categorySlug(event.target.value) } : {}) })} placeholder="e.g. Coastal escapes" /></label>
              <label>Page URL<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={120} value={content.slug} onChange={(event) => { setSlugEdited(true); update({ slug: event.target.value }); }} placeholder="coastal-escapes" /></label>
              <small>/categories/{content.slug || 'your-page-name'}{existing && ' · Changing the URL will break existing links to this page.'}</small>
              <label>Description<textarea rows={3} maxLength={240} value={content.description} onChange={(event) => update({ description: event.target.value })} /></label>
              <label>Cover image URL<input maxLength={2048} value={content.image} onChange={(event) => update({ image: event.target.value })} placeholder="https://… or /assets/…" /></label>
              <div className="category-cover">
                {content.image && <img src={content.image} alt="Category cover preview" />}
                <label>Upload cover image<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { void upload(event.target.files?.[0]); event.target.value = ''; }} /><small>JPEG, PNG or WebP · maximum 4 MB</small></label>
              </div>
            </div>
            <section className="category-hotels" aria-labelledby="category-hotels-title">
              <h2 id="category-hotels-title">Hotels in this collection <small>({content.hotels.length}/50)</small></h2>
              <p>Look up hotels below and add them to the list. Use the arrows to set their order on the page.</p>
              <ol className="category-hotel-rows">
                {content.hotels.map((hotel, index) => <li key={hotel.id}>
                  <div><strong>{index + 1}. {hotel.name}</strong><small>{hotel.location || `Hotel #${hotel.id}`}</small></div>
                  <div className="homepage-editor-actions">
                    <button type="button" disabled={index === 0} aria-label={`Move ${hotel.name} up`} onClick={() => moveHotel(index, -1)}>↑</button>
                    <button type="button" disabled={index === content.hotels.length - 1} aria-label={`Move ${hotel.name} down`} onClick={() => moveHotel(index, 1)}>↓</button>
                    <button type="button" aria-label={`Remove ${hotel.name}`} onClick={() => update({ hotels: content.hotels.filter((item) => item.id !== hotel.id) })}>Remove</button>
                  </div>
                </li>)}
              </ol>
              {!content.hotels.length && <p className="category-empty">No hotels selected yet.</p>}
              <HotelPicker selectedIds={content.hotels.map((hotel) => hotel.id)} onSelect={(hotel) => update({ hotels: [...content.hotels, hotel] })} />
            </section>
            <div className="category-publishing">
              <label><input type="checkbox" checked={content.published} onChange={(event) => update({ published: event.target.checked })} />Publish this category page</label>
              <label><input type="checkbox" checked={content.showOnHomepage} onChange={(event) => update({ showOnHomepage: event.target.checked })} />Show in homepage inspiration cards when published</label>
              <p>Publishing needs a cover image and at least one hotel. Uncheck “Publish” and save to return a page to draft.</p>
            </div>
          </fieldset>
          <div className="homepage-editor-toolbar homepage-editor-bottom">
            {existing?.published ? <Link to={categoryPath(existing)} target="_blank" rel="noopener noreferrer">View published page ↗</Link> : <span>Drafts are only visible here.</span>}
            <button type="submit" disabled={busy || Boolean(recovery) || (!dirty && Boolean(existing))}>{busy ? 'Please wait…' : content.published ? 'Save and publish' : 'Save draft'}</button>
          </div>
        </form> : <div className="category-empty"><h2>Build a hotel collection</h2><p>Choose an existing page or create a new category to get started.</p><Link to="/admin/categories/new" onClick={choosePage}>Create a category →</Link></div>}
      </div>}
    </>}
  </section></Layout>;
};
export default CategoryEditor;
