; =====================================================
; Inno Setup Script for Elyx Programming Language
; Author: Manuel Ricardo
; Version: 0.1.0
; =====================================================

#define MyAppName "Elyx"
#define MyAppVersion "0.1.1"
#define MyAppPublisher "ZtaMDev"
#define MyAppExeName "dsxrepl.exe"
#define Src ".."

[Setup]
; --- App Info ---
AppName={#MyAppName}
AppVersion={#MyAppVersion}
DefaultDirName={pf}\{#MyAppName}
DefaultGroupName={#MyAppName}
OutputBaseFilename=Setup_{#MyAppName}_{#MyAppVersion}
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
UninstallDisplayIcon={app}\icon.ico
SetupIconFile={#Src}\icon.ico
LicenseFile={#Src}\LICENSE.txt
InfoBeforeFile={#Src}\README.md
PrivilegesRequired=admin
DisableProgramGroupPage=no
Uninstallable=yes
UninstallDisplayName={#MyAppName} {#MyAppVersion}
OutputDir=output

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "addtopath"; Description: "Add Elyx to system PATH (recommended — lets you run `dsx` and `dsxrepl` from any terminal)"; GroupDescription: "System Integration:";

[Files]
Source: "{#Src}\dist\dsx.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Src}\dist\dsxrepl.exe"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Src}\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Src}\README.md"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#Src}\LICENSE.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Elyx REPL"; Filename: "{app}\dsxrepl.exe"; IconFilename: "{app}\icon.ico"
Name: "{group}\Elyx CLI (README)"; Filename: "{app}\README.md"; WorkingDir: "{app}"; IconFilename: "{app}\icon.ico"
Name: "{commondesktop}\Elyx REPL"; Filename: "{app}\dsxrepl.exe"; IconFilename: "{app}\icon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "Launch Elyx REPL"; Flags: nowait postinstall shellexec skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}"

[Code]
const
  HKCU_ENV_KEY = 'Environment';
  HKLM_ENV_KEY = 'SYSTEM\CurrentControlSet\Control\Session Manager\Environment';
  WM_SETTINGCHANGE = $1A;
  SMTO_ABORTIFHUNG = $2;

procedure SendMessageTimeout(hWnd: Integer; Msg: Integer; wParam: Integer; lParam: String; fuFlags: Integer; uTimeout: Integer; var lpdwResult: Integer);
  external 'SendMessageTimeoutA@user32.dll stdcall';

procedure AddToPath(Path: String);
var
  OldPath, NewPath: String;
  RootKey: Integer;
  SubKey: String;
  res: Integer;
begin
  // Choose root and subkey depending on privileges
  if IsAdmin then
  begin
    RootKey := HKEY_LOCAL_MACHINE;
    SubKey := HKLM_ENV_KEY;
  end
  else
  begin
    RootKey := HKEY_CURRENT_USER;
    SubKey := HKCU_ENV_KEY;
  end;

  // Read existing Path value (if present)
  if not RegQueryStringValue(RootKey, SubKey, 'Path', OldPath) then
    OldPath := '';

  // Only add if not already present
  if (OldPath = '') then
    NewPath := Path
  else if Pos(UpperCase(Path), UpperCase(OldPath)) = 0 then
    NewPath := OldPath + ';' + Path
  else
    NewPath := OldPath;

  // Write back if changed
  if NewPath <> OldPath then
  begin
    RegWriteStringValue(RootKey, SubKey, 'Path', NewPath);
    // Notify the system that the environment has changed so processes can pick up the new PATH
  SendMessageTimeout($FFFF, WM_SETTINGCHANGE, 0, 'Environment', SMTO_ABORTIFHUNG, 5000, res);
  end;
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if WizardIsTaskSelected('addtopath') then
      AddToPath(ExpandConstant('{app}'));
  end;
end;
