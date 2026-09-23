import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import SearchResults from './SearchResults';
import { CategoryPage as Category, fetchCategory } from '../utils/categoryPages';

const CategoryPage: React.FC = () => {
  const { slug = '' } = useParams();
  const [category, setCategory] = useState<Category | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    setCategory(null); setError('');
    void fetchCategory(slug).then((page) => { if (active) setCategory(page); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load this category'); });
    return () => { active = false; };
  }, [slug, retry]);
  if (category && category.slug === slug) return <SearchResults key={`${category.id}:${category.version}`} category={category} />;
  return <Layout><section className="container py-5">
    {error ? <><h1>Category unavailable</h1><p role="alert">{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button><p><Link to="/#destinations">Explore our collections</Link></p></> : <p role="status">Loading collection…</p>}
  </section></Layout>;
};
export default CategoryPage;
