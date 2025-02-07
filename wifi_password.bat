:: Ejecutable para obtener el listado y contraseña de la red
@echo off
setlocal enabledelayedexpansion

:: Obtener la lista de perfiles WiFi
for /f "tokens=1,2 delims=:" %%A in ('netsh wlan show profile ^| findstr ":"') do (
    set "network=%%B"
    set "network=!network:~1!"
    set /a count+=1
    set "wifi[!count!]=!network!"
)

:: Mostrar las opciones disponibles
echo Selecciona una red WiFi para ver su contraseña:
for /l %%i in (1,1,%count%) do echo %%i. !wifi[%%i]!

echo.
set /p choice=Ingresa el numero de la red WiFi: 

:: Validar la selección y ejecutar el comando
if defined wifi[%choice%] (
    set "selected=!wifi[%choice%]!"
    echo Mostrando la clave de la red: !selected!
    netsh wlan show profile name="!selected!" key=clear | findstr "Contenido de la clave"
) else (
    echo Opcion invalida. Saliendo...
)

pause
