[Reflection.Assembly]::LoadWithPartialName("System.Drawing")
$path = "C:\Proyectos\Sr y Sra Pinto\images-catalogo\hamburguesa_jr.png"
$img = [System.Drawing.Image]::FromFile($path)
Write-Output $img.Width
$img.Dispose()
