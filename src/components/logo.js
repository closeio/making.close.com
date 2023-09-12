import React from 'react';
import SVG from '../assets/logo.svg';
import * as styles from '../styles/logo.module.scss';

const Logo = () => (
  <div className={styles.logo}>
    <SVG />
  </div>
);

export default Logo;
