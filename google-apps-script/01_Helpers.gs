// 模組：共用小工具

/** 格式化日期 Helper */
function formatDate(val, formatStr = "yyyy-MM-dd") {
  if (!val) return '';

  if (val instanceof Date) {
    return Utilities.formatDate(val, CONFIG.TIMEZONE, formatStr);
  }

  if (typeof val === 'string') {
    const cleanVal = val.startsWith("'") ? val.substring(1) : val;

    if (formatStr === "yyyy-MM-dd") {
      return cleanVal.split(/[T ]/)[0];
    }
    return cleanVal;
  }

  return String(val);
}

function normalizeEmail(email) {
  return email ? String(email).trim().toLowerCase() : '';
}

/** 隨機頭像 Helper */
function getRandomAvatar() {
  const styles = ['avataaars', 'bottts', 'micah', 'identicon', 'lorelei'];
  const seeds = ['Felix', 'Aneka', 'Midnight', 'Bubba', 'Sasha', 'Snuggles', 'Gizmo', 'Zoe', 'Luna', 'Apollo', 'Atlas', 'Pixel', 'Turbo'];
  const style = styles[Math.floor(Math.random() * styles.length)];
  const seed = seeds[Math.floor(Math.random() * seeds.length)];
  return `${style}:${seed}`;
}
