<?php
// Configuración sencilla para conectar con MySQL.
// Se puede sobreescribir mediante variables de entorno o un archivo .env (clave=valor).

$defaultConfig = [
    'DB_HOST' => getenv('DB_HOST') ?: '127.0.0.1',
    'DB_NAME' => getenv('DB_NAME') ?: 'aapp_manager',
    'DB_USER' => getenv('DB_USER') ?: 'root',
    'DB_PASS' => getenv('DB_PASS') ?: '',
    'DB_PORT' => getenv('DB_PORT') ?: '3306',
];

$envFile = __DIR__ . '/.env';
if (is_readable($envFile)) {
    $envValues = parse_ini_file($envFile, false, INI_SCANNER_RAW);
    if (is_array($envValues)) {
        foreach ($envValues as $key => $value) {
            $upperKey = strtoupper($key);
            $defaultConfig[$upperKey] = $value;
        }
    }
}

function get_pdo(): PDO
{
    static $pdo = null;
    global $defaultConfig;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf(
        'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
        $defaultConfig['DB_HOST'],
        $defaultConfig['DB_PORT'],
        $defaultConfig['DB_NAME']
    );

    $pdo = new PDO($dsn, $defaultConfig['DB_USER'], $defaultConfig['DB_PASS'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    return $pdo;
}
