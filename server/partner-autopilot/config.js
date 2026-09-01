'use strict';

/**
 * Partner Autopilot production defaults.
 * AUTO_PUBLISH_PARTNERS=false — pilot partners require manual Control publish.
 */
function isAutoPublishPartners() {
  return String(process.env.AUTO_PUBLISH_PARTNERS || '').toLowerCase() === 'true';
}

function isAutoInviteOnReady() {
  if (String(process.env.AUTO_INVITE_PARTNERS || '').toLowerCase() === 'false') {
    return false;
  }
  return String(process.env.AUTO_INVITE_PARTNERS || 'true').toLowerCase() === 'true';
}

module.exports = {
  isAutoPublishPartners: isAutoPublishPartners,
  isAutoInviteOnReady: isAutoInviteOnReady
};
