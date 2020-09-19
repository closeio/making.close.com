import CMS from 'netlify-cms-app';

import Styles from '!css-loader!sass-loader!../styles/global.scss';
import BlogPostPreview from './preview-templates/BlogTemplatePreview';

CMS.registerPreviewStyle(Styles.toString(), { raw: true });
CMS.registerPreviewTemplate('posts', BlogPostPreview);
