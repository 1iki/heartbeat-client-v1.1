import React from "react";
import { AuthConfig } from "@/types";

interface AuthConfigFormProps {
    config: AuthConfig;
    onChange: (config: AuthConfig) => void;
}

export function AuthConfigForm({ config, onChange }: AuthConfigFormProps) {
    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Tipe Autentikasi</label>
                <select
                    className="w-full bg-white/5 border border-white/10 rounded p-2 text-white focus:outline-none focus:border-status-fresh [&>option]:bg-gray-800 [&>option]:text-white [&>option]:py-2"
                    value={config.type}
                    onChange={(e) => onChange({ ...config, type: e.target.value as any })}
                >
                    <option value="NONE" className="bg-gray-800 text-white">Tidak Ada</option>
                    <option value="BASIC" className="bg-gray-800 text-white">Basic Auth</option>
                    <option value="BEARER" className="bg-gray-800 text-white">Bearer Token</option>
                    <option value="API_KEY" className="bg-gray-800 text-white">API Key</option>
                    <option value="BROWSER_LOGIN" className="bg-gray-800 text-white">Browser Login (Headless)</option>
                </select>
            </div>

            {/* Auth Config Fields */}
            {config.type === "BASIC" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1">Username</label>
                        <input
                            type="text"
                            placeholder="admin"
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                            value={config.username || ""}
                            onChange={(e) =>
                                onChange({ ...config, username: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1">Kata Sandi</label>
                        <input
                            type="password"
                            placeholder="Biarkan kosong untuk tetap menggunakan yang lama"
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                            value={config.password || ""}
                            onChange={(e) =>
                                onChange({ ...config, password: e.target.value })
                            }
                        />
                    </div>
                </div>
            )}

            {config.type === "BEARER" && (
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <label className="block text-xs font-medium text-white/50 mb-1">Token</label>
                    <input
                        type="password"
                        placeholder="ey... (Biarkan kosong untuk tetap menggunakan yang lama)"
                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm font-mono"
                        value={config.token || ""}
                        onChange={(e) => onChange({ ...config, token: e.target.value })}
                    />
                </div>
            )}

            {config.type === "API_KEY" && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1">Nama Header</label>
                        <input
                            type="text"
                            placeholder="X-API-Key"
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                            value={config.headerName || ""}
                            onChange={(e) =>
                                onChange({ ...config, headerName: e.target.value })
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-white/50 mb-1">Nilai</label>
                        <input
                            type="password"
                            placeholder="Rahasia... (Biarkan kosong untuk tetap menggunakan yang lama)"
                            className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                            value={config.headerValue || ""}
                            onChange={(e) =>
                                onChange({ ...config, headerValue: e.target.value })
                            }
                        />
                    </div>
                </div>
            )}

            {config.type === "BROWSER_LOGIN" && (
                <div className="space-y-4 p-4 bg-white/5 rounded-lg border border-white/10">
                    {/* Credentials */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1">Username / Email</label>
                            <input
                                type="text"
                                placeholder="user@example.com"
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                value={config.username || ""}
                                onChange={(e) => onChange({ ...config, username: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1">Kata Sandi</label>
                            <input
                                type="password"
                                placeholder="Kata Sandi"
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                value={config.password || ""}
                                onChange={(e) => onChange({ ...config, password: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Login Type & URL */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1">Tipe Login</label>
                            <select
                                className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm [&>option]:bg-gray-800 [&>option]:text-white [&>option]:py-2"
                                value={config.loginType || "page"}
                                onChange={(e) => onChange({ ...config, loginType: e.target.value as "page" | "modal" })}
                            >
                                <option value="page" className="bg-gray-800 text-white">Halaman Login</option>
                                <option value="modal" className="bg-gray-800 text-white">Modal / Popup Login</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-white/50 mb-1">
                                {config.loginType === "modal" ? "Pemicu Modal (Opsional)" : "URL Login (Opsional)"}
                            </label>
                            {config.loginType === "modal" ? (
                                <input
                                    type="text"
                                    placeholder='button:has-text("Login")'
                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm font-mono"
                                    value={config.modalTriggerSelector || ""}
                                    onChange={(e) => onChange({ ...config, modalTriggerSelector: e.target.value })}
                                />
                            ) : (
                                <input
                                    type="text"
                                    placeholder="https://example.com/login"
                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm font-mono"
                                    value={config.loginUrl || ""}
                                    onChange={(e) => onChange({ ...config, loginUrl: e.target.value })}
                                />
                            )}
                        </div>
                    </div>

                    {/* Advanced Selectors */}
                    <div className="pt-2 border-t border-white/10">
                        <details className="group">
                            <summary className="text-xs text-white/50 cursor-pointer hover:text-white flex items-center gap-2">
                                <span>⚙️ Selektor Lanjutan</span>
                                <span className="group-open:rotate-180 transition-transform">▼</span>
                            </summary>
                            <div className="grid grid-cols-1 gap-3 mt-3 pl-2 border-l-2 border-white/10">
                                <div>
                                    <label className="block text-xs font-medium text-white/50 mb-1">Selektor Input Username</label>
                                    <input
                                        type="text"
                                        placeholder='input[name="username"]'
                                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm font-mono"
                                        value={config.usernameSelector || ""}
                                        onChange={(e) => onChange({ ...config, usernameSelector: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/50 mb-1">Selektor Input Password</label>
                                    <input
                                        type="text"
                                        placeholder='input[name="password"]'
                                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm font-mono"
                                        value={config.passwordSelector || ""}
                                        onChange={(e) => onChange({ ...config, passwordSelector: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/50 mb-1">Selektor Tombol Submit</label>
                                    <input
                                        type="text"
                                        placeholder='button[type="submit"]'
                                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm font-mono"
                                        value={config.submitSelector || ""}
                                        onChange={(e) => onChange({ ...config, submitSelector: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-white/50 mb-1">Selektor Verifikasi (Untuk memverifikasi login)</label>
                                    <input
                                        type="text"
                                        placeholder='.user-profile, #dashboard'
                                        className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm font-mono"
                                        value={config.loginSuccessSelector || ""}
                                        onChange={(e) => onChange({ ...config, loginSuccessSelector: e.target.value })}
                                    />
                                </div>
                            </div>
                        </details>
                    </div>
                </div>
            )}
        </div>
    );
}
