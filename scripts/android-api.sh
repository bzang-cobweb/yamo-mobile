#!/bin/sh
# Émulateur Android : joindre l'API Laravel de DDEV à la même adresse que le
# simulateur iOS (EXPO_PUBLIC_API_URL, ex. http://yamo.ddev.site/api).
#
# *.ddev.site désigne 127.0.0.1, c'est-à-dire l'émulateur lui-même : son port 80
# est renvoyé vers celui du Mac (routeur DDEV). Ouvrir le port 80 demande adbd en
# root : image « Google APIs » seulement (pas « Google Play »). À relancer après
# chaque démarrage de l'émulateur.
set -e

ADB="${ANDROID_HOME:-$HOME/Library/Android/sdk}/platform-tools/adb"
if [ ! -x "$ADB" ]; then
  ADB=adb
fi

"$ADB" wait-for-device
"$ADB" root >/dev/null
"$ADB" wait-for-device
"$ADB" reverse tcp:80 tcp:80 >/dev/null
echo "Émulateur : port 80 renvoyé vers le Mac (API DDEV joignable)."
