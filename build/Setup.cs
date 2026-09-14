using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;
using System.Linq;
using System.Reflection;
using System.Text;

namespace RBGestaoFinanceiraSetup
{
    internal static class Program
    {
        private const string AppName = "RB Gestao Financeira";

        [STAThread]
        private static void Main()
        {
            try
            {
                string installRoot = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "Programs",
                    "RB Gestao Financeira");

                string tempZip = Path.Combine(Path.GetTempPath(), "rb-gestao-financeira-payload-" + Guid.NewGuid().ToString("N") + ".zip");
                ExtractPayload(tempZip);

                if (Directory.Exists(installRoot))
                {
                    Directory.Delete(installRoot, true);
                }

                Directory.CreateDirectory(installRoot);
                ZipFile.ExtractToDirectory(tempZip, installRoot);
                File.Delete(tempZip);

                string exePath = Path.Combine(installRoot, "RB_Gestao_Financeira.exe");
                string iconPath = Path.Combine(installRoot, "app", "assets", "rb_gestao.ico");

                CreateShortcuts(exePath, installRoot, iconPath);

                if (File.Exists(exePath))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = exePath,
                        WorkingDirectory = installRoot,
                        UseShellExecute = true
                    });
                }

                System.Windows.Forms.MessageBox.Show(
                    "Instalação concluída com sucesso.",
                    AppName,
                    System.Windows.Forms.MessageBoxButtons.OK,
                    System.Windows.Forms.MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show(
                    "Não foi possível concluir a instalação.\n\n" + ex.Message,
                    AppName,
                    System.Windows.Forms.MessageBoxButtons.OK,
                    System.Windows.Forms.MessageBoxIcon.Error);
            }
        }

        private static void ExtractPayload(string outputPath)
        {
            Assembly assembly = Assembly.GetExecutingAssembly();
            string resourceName = assembly.GetManifestResourceNames().FirstOrDefault(name => name.EndsWith("payload.zip", StringComparison.OrdinalIgnoreCase));
            if (resourceName == null)
            {
                throw new InvalidOperationException("Payload interno não encontrado.");
            }

            using (Stream input = assembly.GetManifestResourceStream(resourceName))
            using (FileStream output = File.Create(outputPath))
            {
                input.CopyTo(output);
            }
        }

        private static void CreateShortcuts(string exePath, string installRoot, string iconPath)
        {
            string desktop = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
            string programs = Environment.GetFolderPath(Environment.SpecialFolder.Programs);
            string startMenuDir = Path.Combine(programs, AppName);
            Directory.CreateDirectory(startMenuDir);

            string scriptPath = Path.Combine(Path.GetTempPath(), "rb-gestao-shortcuts-" + Guid.NewGuid().ToString("N") + ".ps1");
            string script =
                "$shell = New-Object -ComObject WScript.Shell\r\n" +
                "foreach ($shortcutPath in @(" + PsQuote(Path.Combine(desktop, AppName + ".lnk")) + ", " + PsQuote(Path.Combine(startMenuDir, AppName + ".lnk")) + ")) {\r\n" +
                "  $shortcut = $shell.CreateShortcut($shortcutPath)\r\n" +
                "  $shortcut.TargetPath = " + PsQuote(exePath) + "\r\n" +
                "  $shortcut.WorkingDirectory = " + PsQuote(installRoot) + "\r\n" +
                "  $shortcut.IconLocation = " + PsQuote(iconPath) + "\r\n" +
                "  $shortcut.Save()\r\n" +
                "}\r\n";

            File.WriteAllText(scriptPath, script, new UTF8Encoding(false));
            Process process = Process.Start(new ProcessStartInfo
            {
                FileName = "powershell.exe",
                Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + scriptPath + "\"",
                CreateNoWindow = true,
                UseShellExecute = false
            });
            process.WaitForExit();
            File.Delete(scriptPath);
        }

        private static string PsQuote(string value)
        {
            return "'" + value.Replace("'", "''") + "'";
        }
    }
}
