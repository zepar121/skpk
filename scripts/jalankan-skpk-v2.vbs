' Jalankan dev server SKPK v2 tersembunyi (tanpa jendela), lalu buka browser.
Set sh = CreateObject("WScript.Shell")
Set http = Nothing
running = False
On Error Resume Next
Set http = CreateObject("MSXML2.ServerXMLHTTP")
http.setTimeouts 1000, 1000, 1000, 1000
http.open "GET", "http://127.0.0.1:4332/", False
http.send
If Err.Number = 0 Then running = True
On Error GoTo 0
If Not running Then
  sh.CurrentDirectory = "C:\Users\user\Documents\SKPK\website-skpk-v2"
  sh.Run "cmd /c npm run dev >> dev-server.log 2>&1", 0, False
  WScript.Sleep 6000
End If
sh.Run "http://127.0.0.1:4332/"
