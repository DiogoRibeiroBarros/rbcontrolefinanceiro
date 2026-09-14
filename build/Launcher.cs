using System;
using System.Diagnostics;
using System.IO;

namespace RBGestaoFinanceira
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;
            string appFile = Path.Combine(baseDir, "app", "index.html");

            if (!File.Exists(appFile))
            {
                System.Windows.Forms.MessageBox.Show(
                    "Nao foi possivel encontrar app\\index.html ao lado do executavel.",
                    "RB Gestao Financeira",
                    System.Windows.Forms.MessageBoxButtons.OK,
                    System.Windows.Forms.MessageBoxIcon.Error);
                return;
            }

            string appUrl = new Uri(appFile).AbsoluteUri;
            string browser = FindBrowser();

            try
            {
                if (!string.IsNullOrWhiteSpace(browser))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = browser,
                        Arguments = "--app=\"" + appUrl + "\"",
                        UseShellExecute = false
                    });
                    return;
                }

                Process.Start(new ProcessStartInfo
                {
                    FileName = appFile,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                System.Windows.Forms.MessageBox.Show(
                    "Nao foi possivel abrir o aplicativo.\n\n" + ex.Message,
                    "RB Gestao Financeira",
                    System.Windows.Forms.MessageBoxButtons.OK,
                    System.Windows.Forms.MessageBoxIcon.Error);
            }
        }

        private static string FindBrowser()
        {
            string edge = FindOnPath("msedge.exe");
            if (!string.IsNullOrWhiteSpace(edge)) return edge;

            string chrome = FindOnPath("chrome.exe");
            if (!string.IsNullOrWhiteSpace(chrome)) return chrome;

            string[] common =
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google", "Chrome", "Application", "chrome.exe")
            };

            foreach (string path in common)
            {
                if (File.Exists(path)) return path;
            }

            return null;
        }

        private static string FindOnPath(string fileName)
        {
            string pathVar = Environment.GetEnvironmentVariable("PATH") ?? "";
            foreach (string dir in pathVar.Split(Path.PathSeparator))
            {
                try
                {
                    if (string.IsNullOrWhiteSpace(dir)) continue;
                    string candidate = Path.Combine(dir.Trim(), fileName);
                    if (File.Exists(candidate)) return candidate;
                }
                catch
                {
                    // Ignore invalid PATH entries.
                }
            }
            return null;
        }
    }
}
