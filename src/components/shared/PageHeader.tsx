import React from 'react';
import Breadcrumb, { BreadcrumbItem } from './Breadcrumb';

interface PageHeaderProps {
  title: string;
  breadcrumbs: BreadcrumbItem[];
  backgroundImage?: string;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ 
  title, 
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
              <h1>{title}</h1>
              <Breadcrumb items={breadcrumbs} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PageHeader;

