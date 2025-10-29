import React from 'react';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  text?: string;
  breadcrumbs?: BreadcrumbItem[];
  backgroundImage?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
  text,
  breadcrumbs,
  backgroundImage,
  className = ''
}) => {
  const style = backgroundImage ? {
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  } : {};

  return (
    <section className={`page-header ${className}`} style={style}>
      <div className="container">
        <div className="row">
          <div className="col-md-12">
            <div className="page-header-content">
              {breadcrumbs && <Breadcrumb items={breadcrumbs} />}
              <h1>{title}</h1>
              {text && <p>{text}</p>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PageHeader;

