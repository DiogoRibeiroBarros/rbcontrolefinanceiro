using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;

internal static class IconTool
{
    private static readonly int[] Sizes = { 256, 128, 64, 48, 32, 16 };

    public static void Main(string[] args)
    {
        if (args.Length < 2)
        {
            Console.Error.WriteLine("Usage: IconTool <source-image> <destination-ico>");
            Environment.Exit(2);
        }

        using (Image source = Image.FromFile(args[0]))
        using (FileStream output = File.Create(args[1]))
        using (BinaryWriter writer = new BinaryWriter(output))
        {
            writer.Write((ushort)0);
            writer.Write((ushort)1);
            writer.Write((ushort)Sizes.Length);

            byte[][] images = new byte[Sizes.Length][];
            for (int i = 0; i < Sizes.Length; i++)
            {
                images[i] = CreateIconImage(source, Sizes[i]);
            }

            int offset = 6 + (16 * Sizes.Length);
            for (int i = 0; i < Sizes.Length; i++)
            {
                int size = Sizes[i];
                writer.Write((byte)(size == 256 ? 0 : size));
                writer.Write((byte)(size == 256 ? 0 : size));
                writer.Write((byte)0);
                writer.Write((byte)0);
                writer.Write((ushort)1);
                writer.Write((ushort)32);
                writer.Write(images[i].Length);
                writer.Write(offset);
                offset += images[i].Length;
            }

            for (int i = 0; i < Sizes.Length; i++)
            {
                writer.Write(images[i]);
            }
        }
    }

    private static byte[] CreateIconImage(Image source, int size)
    {
        using (Bitmap canvas = new Bitmap(size, size, PixelFormat.Format32bppArgb))
        using (Graphics graphics = Graphics.FromImage(canvas))
        using (MemoryStream stream = new MemoryStream())
        using (BinaryWriter writer = new BinaryWriter(stream))
        {
            graphics.Clear(Color.Transparent);
            graphics.CompositingQuality = CompositingQuality.HighQuality;
            graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
            graphics.SmoothingMode = SmoothingMode.HighQuality;
            graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

            float scale = Math.Min((float)size / source.Width, (float)size / source.Height);
            int width = Math.Max(1, (int)Math.Round(source.Width * scale));
            int height = Math.Max(1, (int)Math.Round(source.Height * scale));
            int x = (size - width) / 2;
            int y = (size - height) / 2;
            graphics.DrawImage(source, new Rectangle(x, y, width, height));

            writer.Write(40);
            writer.Write(size);
            writer.Write(size * 2);
            writer.Write((ushort)1);
            writer.Write((ushort)32);
            writer.Write(0);
            writer.Write(size * size * 4);
            writer.Write(0);
            writer.Write(0);
            writer.Write(0);
            writer.Write(0);

            for (int row = size - 1; row >= 0; row--)
            {
                for (int col = 0; col < size; col++)
                {
                    Color pixel = canvas.GetPixel(col, row);
                    writer.Write(pixel.B);
                    writer.Write(pixel.G);
                    writer.Write(pixel.R);
                    writer.Write(pixel.A);
                }
            }

            int maskStride = ((size + 31) / 32) * 4;
            byte[] mask = new byte[maskStride * size];
            writer.Write(mask);

            return stream.ToArray();
        }
    }
}
