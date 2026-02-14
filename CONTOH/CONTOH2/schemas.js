const mongoose = require('mongoose');

/**
 * Schema MonitoredUrl
 * Registry URL yang dipantau
 */
const monitoredUrlSchema = new mongoose.Schema({
  url: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 2048
  },
  name: {
    type: String,
    trim: true,
    maxlength: 255
  },
  description: {
    type: String,
    trim: true
  },
  checkInterval: {
    type: Number,
    default: 60000,
    min: 10000
  },
  enabled: {
    type: Boolean,
    default: true
  },
  // Authentication fields
  requiresAuth: {
    type: Boolean,
    default: false
  },
  authCredentials: {
    username: {
      type: String,
      trim: true
    },
    password: {
      type: String
    },
    loginUrl: {
      type: String,
      trim: true,
      maxlength: 2048
    },
    loginType: {
      type: String,
      enum: ['page', 'modal'],
      default: 'page'
    },
    modalTriggerSelector: {
      type: String,
      trim: true,
      maxlength: 512
    },
    loginSelectors: {
      usernameSelector: {
        type: String,
        default: 'input[id="email"],input[name="email"], input[name="username"], input[type="email"], input[id="username"]'
      },
      passwordSelector: {
        type: String,
        default: 'input[name="password"], input[type="password"], input[id="password"]'
      },
      submitSelector: {
        type: String,
        default: 'button[type="submit"], input[type="submit"], button:has-text("Login")'
      }
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index untuk query efisien
monitoredUrlSchema.index({ enabled: 1 });
monitoredUrlSchema.index({ checkInterval: 1 });
monitoredUrlSchema.index({ url: 1 });

// Perbarui timestamp saat menyimpan
monitoredUrlSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

/**
 * Schema MonitoringLog
 * Hasil pemeriksaan kesehatan
 */
const monitoringLogSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoredUrl',
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['UP', 'DOWN', 'TIMEOUT', 'EMPTY', 'PARTIAL', 'NOT_PLAYABLE', 'IFRAME_FAILED', 'JS_ERROR', 'NETWORK_ERROR']
  },
  httpStatus: {
    type: Number
  },
  responseTime: {
    type: Number
  },
  contentLength: {
    type: Number
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

// Index untuk query efisien
monitoringLogSchema.index({ urlId: 1, checkedAt: -1 });
monitoringLogSchema.index({ status: 1 });
monitoringLogSchema.index({ checkedAt: -1 });

/**
 * Schema ErrorLog
 * Informasi error detail
 */
const errorLogSchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoredUrl',
    required: true
  },
  monitoringLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoringLog'
  },
  errorType: {
    type: String,
    required: true,
    maxlength: 100
  },
  errorMessage: {
    type: String
  },
  errorDetails: {
    type: mongoose.Schema.Types.Mixed
  },
  screenshotPath: {
    type: String,
    maxlength: 512
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index
errorLogSchema.index({ urlId: 1 });
errorLogSchema.index({ monitoringLogId: 1 });
errorLogSchema.index({ errorType: 1 });
errorLogSchema.index({ createdAt: -1 });

/**
 * Schema IframeCheck
 * Monitoring kesehatan iframe
 */
const iframeCheckSchema = new mongoose.Schema({
  monitoringLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoringLog',
    required: true
  },
  iframeSrc: {
    type: String,
    maxlength: 2048
  },
  iframeLoaded: {
    type: Boolean
  },
  loadTime: {
    type: Number
  },
  errorMessage: {
    type: String
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

// Index
iframeCheckSchema.index({ monitoringLogId: 1 });
iframeCheckSchema.index({ iframeLoaded: 1 });

/**
 * Schema VideoCheck
 * Monitoring pemutaran video
 */
const videoCheckSchema = new mongoose.Schema({
  monitoringLogId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoringLog',
    required: true
  },
  videoElementFound: {
    type: Boolean
  },
  videoSrc: {
    type: String,
    maxlength: 2048
  },
  playable: {
    type: Boolean
  },
  readyState: {
    type: Number
  },
  networkState: {
    type: Number
  },
  errorCode: {
    type: Number
  },
  errorMessage: {
    type: String
  },
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

// Index
videoCheckSchema.index({ monitoringLogId: 1 });
videoCheckSchema.index({ playable: 1 });

/**
 * Schema AlertHistory
 * Pelacakan peringatan
 */
const alertHistorySchema = new mongoose.Schema({
  urlId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MonitoredUrl',
    required: true
  },
  alertType: {
    type: String,
    required: true,
    maxlength: 50
  },
  status: {
    type: String,
    required: true,
    maxlength: 50
  },
  message: {
    type: String
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  sentAt: {
    type: Date,
    default: Date.now
  }
});

// Index
alertHistorySchema.index({ urlId: 1 });
alertHistorySchema.index({ sentAt: -1 });

// Buat model
const MonitoredUrl = mongoose.model('MonitoredUrl', monitoredUrlSchema);
const MonitoringLog = mongoose.model('MonitoringLog', monitoringLogSchema);
const ErrorLog = mongoose.model('ErrorLog', errorLogSchema);
const IframeCheck = mongoose.model('IframeCheck', iframeCheckSchema);
const VideoCheck = mongoose.model('VideoCheck', videoCheckSchema);
const AlertHistory = mongoose.model('AlertHistory', alertHistorySchema);

module.exports = {
  MonitoredUrl,
  MonitoringLog,
  ErrorLog,
  IframeCheck,
  VideoCheck,
  AlertHistory
};
