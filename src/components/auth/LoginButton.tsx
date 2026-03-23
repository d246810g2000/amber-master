import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import LogOut from 'lucide-react/dist/esm/icons/log-out';

export function LoginButton() {
  const { currentUser, login, logout } = useAuth();

  if (currentUser) {
    return (
      <div className="flex items-center gap-2 md:gap-3 bg-white/50 backdrop-blur-md pl-1 md:pl-1.5 pr-2 md:pr-3 py-1 md:py-1.5 rounded-full border border-slate-200/50 shadow-sm transition-all hover:bg-white/80">
        <img 
          src={currentUser.picture} 
          alt={currentUser.name} 
          className="w-6 h-6 md:w-7 md:h-7 rounded-full object-cover border border-slate-200 shadow-sm"
          referrerPolicy="no-referrer"
        />
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] font-black text-slate-800 leading-none truncate max-w-[80px]">
            {currentUser.name}
          </span>
          <span className="text-[7px] md:text-[8px] font-bold text-slate-400 leading-tight truncate max-w-[80px]">
            球員登入中
          </span>
        </div>
        <button 
          onClick={logout}
          className="ml-0.5 md:ml-1 p-1 md:p-1.5 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors"
          title="登出"
        >
          <LogOut className="w-3.5 h-3.5 md:w-4 md:h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="scale-[0.70] md:scale-90 origin-right md:origin-center drop-shadow-sm shrink-0 -ml-6 md:-ml-2">
      <GoogleLogin
        onSuccess={credentialResponse => {
          if (credentialResponse.credential) {
            login(credentialResponse.credential);
          }
        }}
        onError={() => {
          console.error('Google Sign-In Failed');
        }}
        useOneTap
        shape="pill"
        theme="filled_black"
        text="signin"
      />
    </div>
  );
}
