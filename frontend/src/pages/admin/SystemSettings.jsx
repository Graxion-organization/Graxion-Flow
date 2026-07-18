import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Shield, 
  Zap, 
  Cpu, 
  Globe,
  Lock,
  MessageSquare,
  Key,
  Database,
  Mail
} from "lucide-react";
import { adminAPI, socialHubAPI } from "../../services/api";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const SystemSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { tab } = useParams();
  const navigate = useNavigate();
  const activeTab = tab || "core";

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await adminAPI.getSettings();
      setSettings(res.data.data.settings || []);
    } catch (err) {
      toast.error("Failed to fetch system settings");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key, value) => {
    setSaving(true);
    try {
      await adminAPI.updateSetting(key, value);
      toast.success(`Updated ${key.replace(/_/g, ' ')}`);
      fetchSettings();
    } catch (err) {
      toast.error("Failed to update setting");
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key, currentValue) => {
    handleUpdate(key, !currentValue);
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  const sections = [
    {
      id: "core",
      title: "Core System Control",
      icon: Shield,
      keys: ['maintenance_mode', 'registration_enabled', 'billing_enabled']
    },
    {
      id: "ai",
      title: "AI Configuration",
      icon: Cpu,
      keys: ['ai_responses_enabled', 'default_ai_model', 'global_system_prompt']
    },
    {
      id: "social",
      title: "Social Media Platforms",
      icon: Zap,
      keys: ['whatsapp_enabled', 'whatsapp_audio_enabled', 'telegram_enabled', 'instagram_enabled', 'instagram_audio_enabled']
    },
    {
      id: "api",
      title: "API Integrations",
      icon: Key,
      keys: ['openai_api_key', 'anthropic_api_key']
    },
    {
      id: "branding",
      title: "Branding & Appearance",
      icon: Globe,
      keys: [
        'branding_site_name',
        'branding_contact_email',
        'branding_contact_phone',
        'branding_logo_url',
        'branding_favicon_url',
        'branding_footer_text',
        'branding_address',
        'branding_address_desc'
      ]
    },
    {
      id: "email",
      title: "Dynamic Email Templates",
      icon: Mail,
      keys: [
        'email_template_welcome_subject',
        'email_template_welcome_body',
        'email_template_forgot_password_subject',
        'email_template_forgot_password_body',
        'email_template_deletion_otp_subject',
        'email_template_deletion_otp_body'
      ]
    },
    {
      id: "languages",
      title: "Language Modules",
      icon: MessageSquare,
      isCustom: true
    }
  ];

  const languageGroups = {
    "Primary & Global Languages": [
      'lang_en-US_enabled',
      'lang_en-IN_enabled',
      'lang_hi-IN_enabled',
      'lang_es-ES_enabled',
      'lang_fr-FR_enabled',
      'lang_ar-AE_enabled'
    ],
    "Regional Indian Languages": [
      'lang_mr-IN_enabled',
      'lang_bn-IN_enabled',
      'lang_gu-IN_enabled',
      'lang_ta-IN_enabled',
      'lang_te-IN_enabled',
      'lang_kn-IN_enabled',
      'lang_ml-IN_enabled',
      'lang_pa-IN_enabled',
      'lang_ur-IN_enabled'
    ]
  };

  const getSetting = (key) => {
    if (!Array.isArray(settings)) return null;
    return settings.find(s => s.key === key);
  };

  const renderSettingInput = (key, setting, isBoolean, isSecret, isLongText, isImage, isTemplate) => {
    if (isBoolean) {
      return (
        <button
          onClick={() => toggleSetting(key, setting.value)}
          disabled={saving}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${
            setting.value ? "bg-emerald-500" : "bg-gray-700"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
              setting.value ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      );
    }
    if (isImage) {
      return (
        <div className="w-full space-y-3">
          <div className="flex items-center gap-3">
            {setting.value && (
              <div className="bg-[#030712] border border-white/10 rounded-xl p-2 shrink-0 flex items-center justify-center">
                <img
                  src={setting.value}
                  alt={key}
                  className={`object-contain ${
                    key.includes('favicon') ? 'w-8 h-8' : 'h-8 max-w-[120px]'
                  }`}
                />
              </div>
            )}
            <div className="flex-1">
              <input
                type="text"
                defaultValue={setting.value}
                onBlur={(e) => {
                  if (e.target.value !== setting.value) {
                    handleUpdate(key, e.target.value);
                  }
                }}
                placeholder="Paste direct image URL..."
                className="w-full bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
            </div>
          </div>
          <div className="relative">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const formData = new FormData();
                formData.append('file', file);
                
                const uploadToast = toast.loading('Uploading branding asset...');
                try {
                  const res = await socialHubAPI.upload(formData);
                  const url = res.data.data.url;
                  await handleUpdate(key, url);
                  toast.success('Branding asset uploaded and set successfully!', { id: uploadToast });
                } catch (err) {
                  toast.error('Upload failed. Try pasting a direct image link.', { id: uploadToast });
                }
              }}
              className="hidden"
              id={`file-upload-${key}`}
            />
            <label
              htmlFor={`file-upload-${key}`}
              className="inline-flex items-center gap-1.5 justify-center px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 cursor-pointer transition-all active:scale-95"
            >
              <Save size={12} /> Upload Asset
            </label>
          </div>
        </div>
      );
    }
    if (isLongText) {
      return (
        <div className="w-full space-y-2">
          <textarea
            defaultValue={setting.value}
            onBlur={(e) => {
              if (e.target.value !== setting.value) {
                handleUpdate(key, e.target.value);
              }
            }}
            className="w-full bg-[#030712] border border-white/10 rounded-xl p-3 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors h-28 leading-relaxed font-sans"
          />
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 w-full">
        <input
          type={isSecret ? "password" : "text"}
          defaultValue={setting.value}
          onBlur={(e) => {
            if (e.target.value !== setting.value) {
              handleUpdate(key, e.target.value);
            }
          }}
          placeholder={isSecret ? "••••••••••••••••" : ""}
          className="flex-1 bg-[#030712] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-emerald-500/50 transition-colors"
        />
        {isSecret && setting.value && (
          <div className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1.5 rounded-lg border border-emerald-500/20 font-bold shrink-0">
            SET
          </div>
        )}
      </div>
    );
  };

  const activeSection = sections.find(s => s.id === activeTab);

  return (
    <div className="pb-20">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden backdrop-blur-xl max-w-5xl"
      >
        {activeSection?.isCustom && activeSection.id === "languages" ? (
          <>
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <activeSection.icon className="w-6 h-6 text-emerald-500" />
                <div>
                  <h2 className="text-xl font-bold">{activeSection.title}</h2>
                  <p className="text-sm text-gray-400 mt-1">Activate or deactivate supported STT and TTS languages globally.</p>
                </div>
              </div>
            </div>
            
            <div className="p-6 space-y-8">
              {Object.entries(languageGroups).map(([groupName, keys]) => (
                <div key={groupName}>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">
                    {groupName}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {keys.map(key => {
                      const setting = getSetting(key);
                      if (!setting) return null;
                      
                      return (
                        <div 
                          key={key} 
                          className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all cursor-pointer ${
                            setting.value 
                              ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' 
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                          onClick={() => toggleSetting(key, setting.value)}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-3 transition-colors ${
                            setting.value ? 'bg-emerald-500 text-white' : 'bg-gray-800 text-gray-400'
                          }`}>
                            <Globe size={18} />
                          </div>
                          <span className="text-sm font-medium text-center text-gray-200">
                            {setting.description.split(' (')[0]}
                          </span>
                          {setting.description.includes('(') && (
                            <span className="text-xs text-gray-500 mt-1">
                              {setting.description.match(/\((.*?)\)/)?.[1]}
                            </span>
                          )}
                          <div className="mt-4">
                            {renderSettingInput(key, setting, true, false, false, false, false)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : activeSection ? (
          <>
            <div className="p-6 border-b border-white/10 flex items-center gap-3 bg-white/[0.02]">
              <activeSection.icon className="w-6 h-6 text-emerald-500" />
              <div>
                <h2 className="text-xl font-bold">{activeSection.title}</h2>
                <p className="text-sm text-gray-400 mt-1">Configure {activeSection.title.toLowerCase()}</p>
              </div>
            </div>
            
            <div className="p-6 grid grid-cols-1 gap-6">
              {activeSection.keys.map(key => {
                const setting = getSetting(key);
                if (!setting) return null;

                const isBoolean = typeof setting.value === 'boolean';
                const isSecret = key.includes('api_key');
                const isLongText = key.includes('prompt') || (key.includes('template') && key.includes('body'));
                const isImage = key.includes('logo_url') || key.includes('favicon_url');
                const isTemplate = key.includes('template');

                return (
                  <div key={key} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-200 capitalize text-base">{key.replace(/_/g, ' ')}</h3>
                      <p className="text-sm text-gray-400 mt-1.5">{setting.description}</p>
                      {isTemplate && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">{"{{name}}"}</span>
                          <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20">{"{{siteName}}"}</span>
                          {key.includes('welcome') && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{"{{logoUrl}}"}</span>
                          )}
                          {key.includes('forgot') && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{"{{resetLink}}"}</span>
                          )}
                          {key.includes('otp') && (
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">{"{{otp}}"}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-4 min-w-[320px] md:min-w-[450px]">
                      {renderSettingInput(key, setting, isBoolean, isSecret, isLongText, isImage, isTemplate)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}
      </motion.div>
    </div>
  );
};

export default SystemSettings;
