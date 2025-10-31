import React from "react";
import { useParams, Link } from "react-router-dom";
import Layout from "../components/layout/Layout";
import PageHeader from "../components/shared/PageHeader";
import { magazinePosts } from "../utils/magazinePosts";

const MagazinePost: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const post = magazinePosts.find((p) => p.slug === slug);

    if (!post) {
        return (
            <Layout>
                <PageHeader title="Post Not Found" />
                <section className="section-padding">
                    <div className="container">
                        <div className="row">
                            <div className="col-md-12 text-center">
                                <h2>Post Not Found</h2>
                                <p>The article you're looking for doesn't exist.</p>
                                <Link to="/the-magazine" className="butn-dark mt-30">
                                    <span>Back to Magazine</span>
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Page Header */}
            <PageHeader title={post.title} backgroundImage={post.image} text={post.date} magazinePost={true} />

            {/* Post Content */}
            <section className="section-padding">
                <div className="container ">
                    <div className="row justify-content-md-center">
                        <div className="col-md-8">
                            <div dangerouslySetInnerHTML={{ __html: post.content }} />
                        </div>
                    </div>
                </div>
            </section>
        </Layout>
    );
};

export default MagazinePost;
