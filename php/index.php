<?php
session_start();
require_once __DIR__ . '/config.php';

try {
    $pdo = get_pdo();
} catch (Throwable $e) {
    http_response_code(500);
    echo 'Error conectando a la base de datos: ' . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8');
    exit;
}

function json_response(array $payload, int $status = 200): void
{
    header('Content-Type: application/json; charset=utf-8');
    http_response_code($status);
    echo json_encode($payload);
    exit;
}

function ensure_state_table(PDO $pdo): void
{
    $pdo->exec(<<<SQL
CREATE TABLE IF NOT EXISTS app_state (
  id TINYINT UNSIGNED PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
SQL);
}

function default_state(): array
{
    return [
        'saas' => [],
        'domains' => [],
        'plans' => [],
        'campaigns' => [],
        'extras' => [],
        'resellers' => [],
        'partners' => [],
        'clients' => [],
        'posSales' => [],
        'expenses' => [],
        'tasks' => [],
        'notes' => [],
        'meta' => ['version' => 1, 'savedAt' => null],
    ];
}

function run_sql_string(PDO $pdo, string $sql, string $context = 'SQL embebido'): void
{
    $chunks = array_filter(array_map('trim', preg_split('/;\s*(?:\r?\n|$)/', $sql)));
    foreach ($chunks as $statement) {
        if ($statement === '') {
            continue;
        }
        try {
            $pdo->exec($statement);
        } catch (Throwable $e) {
            error_log('Error ejecutando ' . $context . ': ' . $e->getMessage());
        }
    }
}

function run_sql_file(PDO $pdo, string $path): void
{
    if (!is_readable($path)) {
        return;
    }
    $sql = file_get_contents($path);
    run_sql_string($pdo, $sql, $path);
}

function ensure_schema(PDO $pdo): void
{
    static $ensured = false;
    if ($ensured) {
        return;
    }

    $sqlDir = null;
    foreach ([__DIR__ . '/../sql', __DIR__ . '/sql'] as $candidate) {
        if (is_dir($candidate)) {
            $sqlDir = $candidate;
            break;
        }
    }

    if ($sqlDir) {
        foreach (['database.sql', 'auth.sql'] as $file) {
            $fullPath = $sqlDir . DIRECTORY_SEPARATOR . $file;
            run_sql_file($pdo, $fullPath);
        }
    } else {
        $embeddedDatabaseSchema = <<<SQL
CREATE TABLE IF NOT EXISTS app_state (
  id TINYINT UNSIGNED PRIMARY KEY,
  data JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS saas (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url VARCHAR(255) NOT NULL,
  logo_url VARCHAR(255) DEFAULT NULL,
  register_url VARCHAR(255) DEFAULT NULL,
  login_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS plans (
  id VARCHAR(64) PRIMARY KEY,
  saas_id VARCHAR(64) NOT NULL,
  frequency VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  features JSON DEFAULT NULL,
  variable_features JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS extras (
  id VARCHAR(64) PRIMARY KEY,
  saas_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  frequency VARCHAR(50) NOT NULL,
  features JSON DEFAULT NULL,
  variable_features JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS campaigns (
  id VARCHAR(64) PRIMARY KEY,
  saas_id VARCHAR(64) NOT NULL,
  ad_name VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  daily_spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_spend DECIMAL(12,2) NOT NULL DEFAULT 0,
  reach INT DEFAULT 0,
  views INT DEFAULT 0,
  cost_per_conversation DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS partners (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(50) DEFAULT NULL,
  commission DECIMAL(5,2) DEFAULT 0,
  notes TEXT
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS clients (
  id VARCHAR(64) PRIMARY KEY,
  saas_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  password VARCHAR(255) DEFAULT NULL,
  extra_ids JSON DEFAULT NULL,
  date DATE DEFAULT NULL,
  notes TEXT,
  links TEXT,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS domains (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  saas_id VARCHAR(64) NOT NULL,
  client_id VARCHAR(64) DEFAULT NULL,
  provider VARCHAR(255) DEFAULT NULL,
  status VARCHAR(50) DEFAULT 'Activo',
  notes TEXT,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE CASCADE,
  FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resellers (
  id VARCHAR(64) PRIMARY KEY,
  saas_id VARCHAR(64) NOT NULL,
  source_type ENUM('plan','extra') NOT NULL,
  source_id VARCHAR(64) NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  sale_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_time VARCHAR(255) DEFAULT NULL,
  requirements TEXT,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS pos_sales (
  id VARCHAR(64) PRIMARY KEY,
  buyer_name VARCHAR(255) NOT NULL,
  buyer_email VARCHAR(255) DEFAULT NULL,
  saas_id VARCHAR(64) NOT NULL,
  plan_id VARCHAR(64) DEFAULT NULL,
  extra_ids JSON DEFAULT NULL,
  date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS expenses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  date DATE NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS tasks (
  id VARCHAR(64) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  saas_id VARCHAR(64) DEFAULT NULL,
  status ENUM('todo','doing','done') NOT NULL DEFAULT 'todo',
  notes TEXT,
  checks JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(64) PRIMARY KEY,
  saas_id VARCHAR(64) DEFAULT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (saas_id) REFERENCES saas(id) ON DELETE SET NULL
) ENGINE=InnoDB;
SQL;

        $embeddedAuthSchema = <<<SQL
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(255) DEFAULT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO users (email, name, password_hash, role)
VALUES
  ('admin@aapp.uno', 'Administrador', '$2y$12$18.5ETI6Zx7Lfvj58tlGh.AsRLS5LBTPWBo2q9BK0qL/Ni7Zb4SR6', 'admin'),
  ('noelia@aapp.uno', 'Noelia', '$2y$12$f449llRcpKKYWtPELbQyu.fHye5ei6pwT5DcpCNMZ26VHJCulD.u.', 'user')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  role = VALUES(role);
SQL;

        run_sql_string($pdo, $embeddedDatabaseSchema, 'esquema embebido de base de datos');
        run_sql_string($pdo, $embeddedAuthSchema, 'esquema embebido de autenticación');
    }
    ensure_state_table($pdo);
    $ensured = true;
}

function decode_json_field($value): array
{
    $decoded = json_decode((string) $value, true);
    return is_array($decoded) ? $decoded : [];
}

function load_database_state(PDO $pdo): array
{
    ensure_schema($pdo);
    $state = default_state();

    $state['saas'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'name' => $row['name'] ?? '',
            'url' => $row['url'] ?? '',
            'logoUrl' => $row['logo_url'] ?? '',
            'registerUrl' => $row['register_url'] ?? '',
            'loginUrl' => $row['login_url'] ?? '',
        ],
        $pdo->query('SELECT id, name, url, logo_url, register_url, login_url FROM saas ORDER BY created_at ASC')->fetchAll()
    );

    $state['plans'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'saasId' => $row['saas_id'] ?? '',
            'frequency' => $row['frequency'] ?? '',
            'title' => $row['title'] ?? '',
            'description' => $row['description'] ?? '',
            'price' => (float) ($row['price'] ?? 0),
            'features' => decode_json_field($row['features'] ?? []),
            'variableFeatures' => decode_json_field($row['variable_features'] ?? []),
        ],
        $pdo->query('SELECT * FROM plans ORDER BY created_at ASC')->fetchAll()
    );

    $state['extras'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'saasId' => $row['saas_id'] ?? '',
            'name' => $row['name'] ?? '',
            'price' => (float) ($row['price'] ?? 0),
            'frequency' => $row['frequency'] ?? '',
            'features' => decode_json_field($row['features'] ?? []),
            'variableFeatures' => decode_json_field($row['variable_features'] ?? []),
        ],
        $pdo->query('SELECT * FROM extras ORDER BY created_at ASC')->fetchAll()
    );

    $state['campaigns'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'saasId' => $row['saas_id'] ?? '',
            'adName' => $row['ad_name'] ?? '',
            'date' => $row['date'] ?? '',
            'dailySpend' => (float) ($row['daily_spend'] ?? 0),
            'totalSpend' => (float) ($row['total_spend'] ?? 0),
            'reach' => (int) ($row['reach'] ?? 0),
            'views' => (int) ($row['views'] ?? 0),
            'costPerConversation' => (float) ($row['cost_per_conversation'] ?? 0),
            'notes' => $row['notes'] ?? '',
        ],
        $pdo->query('SELECT * FROM campaigns ORDER BY date DESC')->fetchAll()
    );

    $state['partners'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'name' => $row['name'] ?? '',
            'company' => $row['company'] ?? '',
            'email' => $row['email'] ?? '',
            'phone' => $row['phone'] ?? '',
            'commission' => (float) ($row['commission'] ?? 0),
            'notes' => $row['notes'] ?? '',
        ],
        $pdo->query('SELECT * FROM partners ORDER BY name ASC')->fetchAll()
    );

    $state['clients'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'name' => $row['name'] ?? '',
            'saasId' => $row['saas_id'] ?? '',
            'planId' => $row['plan_id'] ?? '',
            'extraIds' => decode_json_field($row['extra_ids'] ?? []),
            'email' => $row['email'] ?? '',
            'password' => $row['password'] ?? '',
            'date' => $row['date'] ?? '',
            'notes' => $row['notes'] ?? '',
            'links' => $row['links'] ?? '',
        ],
        $pdo->query('SELECT * FROM clients ORDER BY date DESC')->fetchAll()
    );

    $state['domains'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'name' => $row['name'] ?? '',
            'saasId' => $row['saas_id'] ?? '',
            'clientId' => $row['client_id'] ?? '',
            'provider' => $row['provider'] ?? '',
            'status' => $row['status'] ?? '',
            'notes' => $row['notes'] ?? '',
        ],
        $pdo->query('SELECT * FROM domains ORDER BY name ASC')->fetchAll()
    );

    $state['resellers'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'saasId' => $row['saas_id'] ?? '',
            'sourceType' => $row['source_type'] ?? '',
            'sourceId' => $row['source_id'] ?? '',
            'costPrice' => (float) ($row['cost_price'] ?? 0),
            'salePrice' => (float) ($row['sale_price'] ?? 0),
            'deliveryTime' => $row['delivery_time'] ?? '',
            'requirements' => $row['requirements'] ?? '',
        ],
        $pdo->query('SELECT * FROM resellers ORDER BY saas_id ASC')->fetchAll()
    );

    $state['posSales'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'buyerName' => $row['buyer_name'] ?? '',
            'buyerEmail' => $row['buyer_email'] ?? '',
            'saasId' => $row['saas_id'] ?? '',
            'planId' => $row['plan_id'] ?? '',
            'extraIds' => decode_json_field($row['extra_ids'] ?? []),
            'date' => $row['date'] ?? '',
            'paymentMethod' => $row['payment_method'] ?? '',
            'amount' => (float) ($row['amount'] ?? 0),
            'notes' => $row['notes'] ?? '',
        ],
        $pdo->query('SELECT * FROM pos_sales ORDER BY date DESC')->fetchAll()
    );

    $state['expenses'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'name' => $row['name'] ?? '',
            'amount' => (float) ($row['amount'] ?? 0),
            'date' => $row['date'] ?? '',
        ],
        $pdo->query('SELECT * FROM expenses ORDER BY date DESC, id DESC')->fetchAll()
    );

    $state['tasks'] = array_map(
        function ($row) {
            $checksRaw = decode_json_field($row['checks'] ?? []);
            $checks = [];
            foreach ($checksRaw as $idx => $chk) {
                $label = trim((string) ($chk['label'] ?? ''));
                if ($label === '') {
                    $label = 'Check ' . ($idx + 1);
                }
                $label = trim($label);
                if ($label === '') {
                    continue;
                }
                $checks[] = [
                    'label' => $label,
                    'done' => !empty($chk['done']),
                ];
            }

            return [
                'id' => $row['id'],
                'title' => $row['title'] ?? '',
                'saasId' => $row['saas_id'] ?? '',
                'status' => $row['status'] ?? 'todo',
                'notes' => $row['notes'] ?? '',
                'checks' => $checks,
            ];
        },
        $pdo->query('SELECT * FROM tasks ORDER BY created_at DESC')->fetchAll()
    );

    $state['notes'] = array_map(
        fn($row) => [
            'id' => $row['id'],
            'saasId' => $row['saas_id'] ?? '',
            'title' => $row['title'] ?? '',
            'content' => $row['content'] ?? '',
        ],
        $pdo->query('SELECT * FROM notes ORDER BY created_at DESC')->fetchAll()
    );

    $metaRow = $pdo->query('SELECT data, updated_at FROM app_state WHERE id = 1 LIMIT 1')->fetch();
    if ($metaRow) {
        $metaData = json_decode($metaRow['data'] ?? 'null', true);
        $savedAt = $metaData['meta']['savedAt'] ?? ($metaRow['updated_at'] ?? null);
        $state['meta'] = [
            'version' => $metaData['meta']['version'] ?? 1,
            'savedAt' => $savedAt,
        ];
    }

    return $state;
}

function persist_database_state(PDO $pdo, array $data): void
{
    ensure_schema($pdo);
    $state = default_state();
    foreach (array_keys($state) as $key) {
        if (array_key_exists($key, $data) && is_array($data[$key])) {
            $state[$key] = $data[$key];
        }
    }

    $tables = [
        'pos_sales',
        'resellers',
        'domains',
        'clients',
        'partners',
        'campaigns',
        'extras',
        'plans',
        'saas',
        'expenses',
        'tasks',
        'notes'
    ];

    try {
        $pdo->beginTransaction();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
        foreach ($tables as $table) {
            $pdo->exec("TRUNCATE TABLE `$table`");
        }

        $saasStmt = $pdo->prepare('INSERT INTO saas (id, name, url, logo_url, register_url, login_url) VALUES (:id, :name, :url, :logo_url, :register_url, :login_url)');
        foreach ($state['saas'] as $row) {
            $saasStmt->execute([
                ':id' => $row['id'],
                ':name' => $row['name'] ?? '',
                ':url' => $row['url'] ?? '',
                ':logo_url' => $row['logoUrl'] ?? '',
                ':register_url' => $row['registerUrl'] ?? '',
                ':login_url' => $row['loginUrl'] ?? '',
            ]);
        }

        $planStmt = $pdo->prepare('INSERT INTO plans (id, saas_id, frequency, title, description, price, features, variable_features) VALUES (:id, :saas_id, :frequency, :title, :description, :price, :features, :variable_features)');
        foreach ($state['plans'] as $row) {
            $planStmt->execute([
                ':id' => $row['id'],
                ':saas_id' => $row['saasId'] ?? '',
                ':frequency' => $row['frequency'] ?? '',
                ':title' => $row['title'] ?? '',
                ':description' => $row['description'] ?? '',
                ':price' => (float) ($row['price'] ?? 0),
                ':features' => json_encode($row['features'] ?? [], JSON_UNESCAPED_UNICODE),
                ':variable_features' => json_encode($row['variableFeatures'] ?? [], JSON_UNESCAPED_UNICODE),
            ]);
        }

        $extraStmt = $pdo->prepare('INSERT INTO extras (id, saas_id, name, price, frequency, features, variable_features) VALUES (:id, :saas_id, :name, :price, :frequency, :features, :variable_features)');
        foreach ($state['extras'] as $row) {
            $extraStmt->execute([
                ':id' => $row['id'],
                ':saas_id' => $row['saasId'] ?? '',
                ':name' => $row['name'] ?? '',
                ':price' => (float) ($row['price'] ?? 0),
                ':frequency' => $row['frequency'] ?? '',
                ':features' => json_encode($row['features'] ?? [], JSON_UNESCAPED_UNICODE),
                ':variable_features' => json_encode($row['variableFeatures'] ?? [], JSON_UNESCAPED_UNICODE),
            ]);
        }

        $campaignStmt = $pdo->prepare('INSERT INTO campaigns (id, saas_id, ad_name, date, daily_spend, total_spend, reach, views, cost_per_conversation, notes) VALUES (:id, :saas_id, :ad_name, :date, :daily_spend, :total_spend, :reach, :views, :cost_per_conversation, :notes)');
        foreach ($state['campaigns'] as $row) {
            $campaignStmt->execute([
                ':id' => $row['id'],
                ':saas_id' => $row['saasId'] ?? '',
                ':ad_name' => $row['adName'] ?? '',
                ':date' => $row['date'] ?? null,
                ':daily_spend' => (float) ($row['dailySpend'] ?? 0),
                ':total_spend' => (float) ($row['totalSpend'] ?? 0),
                ':reach' => (int) ($row['reach'] ?? 0),
                ':views' => (int) ($row['views'] ?? 0),
                ':cost_per_conversation' => (float) ($row['costPerConversation'] ?? 0),
                ':notes' => $row['notes'] ?? '',
            ]);
        }

        $partnerStmt = $pdo->prepare('INSERT INTO partners (id, name, company, email, phone, commission, notes) VALUES (:id, :name, :company, :email, :phone, :commission, :notes)');
        foreach ($state['partners'] as $row) {
            $partnerStmt->execute([
                ':id' => $row['id'],
                ':name' => $row['name'] ?? '',
                ':company' => $row['company'] ?? '',
                ':email' => $row['email'] ?? '',
                ':phone' => $row['phone'] ?? '',
                ':commission' => (float) ($row['commission'] ?? 0),
                ':notes' => $row['notes'] ?? '',
            ]);
        }

        $clientStmt = $pdo->prepare('INSERT INTO clients (id, saas_id, plan_id, name, email, password, extra_ids, date, notes, links) VALUES (:id, :saas_id, :plan_id, :name, :email, :password, :extra_ids, :date, :notes, :links)');
        foreach ($state['clients'] as $row) {
            $clientStmt->execute([
                ':id' => $row['id'],
                ':saas_id' => $row['saasId'] ?? '',
                ':plan_id' => $row['planId'] ?? null,
                ':name' => $row['name'] ?? '',
                ':email' => $row['email'] ?? '',
                ':password' => $row['password'] ?? '',
                ':extra_ids' => json_encode($row['extraIds'] ?? [], JSON_UNESCAPED_UNICODE),
                ':date' => $row['date'] ?? null,
                ':notes' => $row['notes'] ?? '',
                ':links' => $row['links'] ?? '',
            ]);
        }

        $domainStmt = $pdo->prepare('INSERT INTO domains (id, name, saas_id, client_id, provider, status, notes) VALUES (:id, :name, :saas_id, :client_id, :provider, :status, :notes)');
        foreach ($state['domains'] as $row) {
            $domainStmt->execute([
                ':id' => $row['id'],
                ':name' => $row['name'] ?? '',
                ':saas_id' => $row['saasId'] ?? '',
                ':client_id' => $row['clientId'] ?? null,
                ':provider' => $row['provider'] ?? '',
                ':status' => $row['status'] ?? '',
                ':notes' => $row['notes'] ?? '',
            ]);
        }

        $resellerStmt = $pdo->prepare('INSERT INTO resellers (id, saas_id, source_type, source_id, cost_price, sale_price, delivery_time, requirements) VALUES (:id, :saas_id, :source_type, :source_id, :cost_price, :sale_price, :delivery_time, :requirements)');
        foreach ($state['resellers'] as $row) {
            $resellerStmt->execute([
                ':id' => $row['id'],
                ':saas_id' => $row['saasId'] ?? '',
                ':source_type' => $row['sourceType'] ?? 'plan',
                ':source_id' => $row['sourceId'] ?? '',
                ':cost_price' => (float) ($row['costPrice'] ?? 0),
                ':sale_price' => (float) ($row['salePrice'] ?? 0),
                ':delivery_time' => $row['deliveryTime'] ?? '',
                ':requirements' => $row['requirements'] ?? '',
            ]);
        }

        $posStmt = $pdo->prepare('INSERT INTO pos_sales (id, buyer_name, buyer_email, saas_id, plan_id, extra_ids, date, payment_method, amount, notes) VALUES (:id, :buyer_name, :buyer_email, :saas_id, :plan_id, :extra_ids, :date, :payment_method, :amount, :notes)');
        foreach ($state['posSales'] as $row) {
            $posStmt->execute([
                ':id' => $row['id'],
                ':buyer_name' => $row['buyerName'] ?? '',
                ':buyer_email' => $row['buyerEmail'] ?? '',
                ':saas_id' => $row['saasId'] ?? '',
                ':plan_id' => $row['planId'] ?? null,
                ':extra_ids' => json_encode($row['extraIds'] ?? [], JSON_UNESCAPED_UNICODE),
                ':date' => $row['date'] ?? null,
                ':payment_method' => $row['paymentMethod'] ?? '',
                ':amount' => (float) ($row['amount'] ?? 0),
                ':notes' => $row['notes'] ?? '',
            ]);
        }

        $expenseStmt = $pdo->prepare('INSERT INTO expenses (name, amount, date) VALUES (:name, :amount, :date)');
        foreach ($state['expenses'] as $row) {
            $expenseStmt->execute([
                ':name' => $row['name'] ?? '',
                ':amount' => (float) ($row['amount'] ?? 0),
                ':date' => $row['date'] ?? null,
            ]);
        }

        $taskStmt = $pdo->prepare('INSERT INTO tasks (id, title, saas_id, status, notes, checks) VALUES (:id, :title, :saas_id, :status, :notes, :checks)');
        foreach ($state['tasks'] as $row) {
            $taskStmt->execute([
                ':id' => $row['id'],
                ':title' => $row['title'] ?? '',
                ':saas_id' => $row['saasId'] ?? null,
                ':status' => $row['status'] ?? 'todo',
                ':notes' => $row['notes'] ?? '',
                ':checks' => json_encode($row['checks'] ?? [], JSON_UNESCAPED_UNICODE),
            ]);
        }

        $noteStmt = $pdo->prepare('INSERT INTO notes (id, saas_id, title, content) VALUES (:id, :saas_id, :title, :content)');
        foreach ($state['notes'] as $row) {
            $noteStmt->execute([
                ':id' => $row['id'],
                ':saas_id' => $row['saasId'] ?? null,
                ':title' => $row['title'] ?? '',
                ':content' => $row['content'] ?? ''
            ]);
        }

        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        $pdo->commit();

        $appStatePayload = $state;
        $appStatePayload['meta']['version'] = isset($state['meta']['version'])
            ? (int) $state['meta']['version']
            : 1;
        $appStatePayload['meta']['savedAt'] = $state['meta']['savedAt'] ?? date(DATE_ATOM);
        $stmt = $pdo->prepare('INSERT INTO app_state (id, data) VALUES (1, :data)
          ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = CURRENT_TIMESTAMP');
        $stmt->execute([':data' => json_encode($appStatePayload, JSON_UNESCAPED_UNICODE)]);
    } catch (Throwable $e) {
        $pdo->rollBack();
        $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
        throw $e;
    }
}

function reset_state(PDO $pdo): array
{
    $fresh = default_state();
    persist_database_state($pdo, $fresh);
    return $fresh;
}

function find_user_by_email(PDO $pdo, string $email): ?array
{
    $stmt = $pdo->prepare('SELECT id, email, name, role, password_hash FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function find_user_by_id(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT id, email, name, role, password_hash FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $id]);
    $user = $stmt->fetch();
    return $user ?: null;
}

function get_authenticated_user(PDO $pdo): ?array
{
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    $user = find_user_by_id($pdo, (int) $_SESSION['user_id']);
    if (!$user) {
        return null;
    }
    return [
        'id' => $user['id'],
        'email' => $user['email'],
        'name' => $user['name'],
        'role' => $user['role'] ?? 'user',
    ];
}

function require_auth(PDO $pdo): array
{
    $user = get_authenticated_user($pdo);
    if (!$user) {
        json_response(['success' => false, 'message' => 'No autorizado.'], 401);
    }
    return $user;
}

if (isset($_GET['action'])) {
    $action = $_GET['action'];
    try {
        ensure_schema($pdo);

        if ($action === 'login') {
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $email = trim((string) ($payload['email'] ?? ''));
            $password = (string) ($payload['password'] ?? '');
            if (!$email || !$password) {
                json_response(['success' => false, 'message' => 'Email y contraseña requeridos.'], 400);
            }
            $user = find_user_by_email($pdo, $email);
            if (!$user || !password_verify($password, $user['password_hash'])) {
                json_response(['success' => false, 'message' => 'Credenciales inválidas.'], 401);
            }
            $_SESSION['user_id'] = $user['id'];
            json_response([
                'success' => true,
                'user' => [
                    'id' => $user['id'],
                    'email' => $user['email'],
                    'name' => $user['name'],
                    'role' => $user['role'] ?? 'user',
                ],
            ]);
        }

        if ($action === 'logout') {
            session_destroy();
            json_response(['success' => true]);
        }

        if ($action === 'session') {
            $user = get_authenticated_user($pdo);
            if (!$user) {
                json_response(['success' => false, 'message' => 'No autorizado.'], 401);
            }
            json_response(['success' => true, 'user' => $user]);
        }

        if ($action === 'change_password') {
            $user = require_auth($pdo);
            $payload = json_decode(file_get_contents('php://input'), true) ?? [];
            $current = (string) ($payload['currentPassword'] ?? '');
            $new = (string) ($payload['newPassword'] ?? '');
            if (!$current || !$new) {
                json_response(['success' => false, 'message' => 'Completá las contraseñas.'], 400);
            }
            if (strlen($new) < 6) {
                json_response(['success' => false, 'message' => 'La nueva contraseña es muy corta.'], 400);
            }
            $dbUser = find_user_by_id($pdo, (int) $user['id']);
            if (!$dbUser || !password_verify($current, $dbUser['password_hash'])) {
                json_response(['success' => false, 'message' => 'Contraseña actual incorrecta.'], 400);
            }
            $newHash = password_hash($new, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
            $stmt->execute([':hash' => $newHash, ':id' => $dbUser['id']]);
            json_response(['success' => true]);
        }

        if ($action === 'load') {
            $user = require_auth($pdo);
            json_response(['success' => true, 'data' => load_database_state($pdo), 'user' => $user]);
        }

        if ($action === 'save') {
            require_auth($pdo);
            $input = file_get_contents('php://input');
            $payload = json_decode($input, true);
            if (!is_array($payload)) {
                json_response(['success' => false, 'message' => 'JSON inválido.'], 400);
            }
            persist_database_state($pdo, $payload);
            json_response(['success' => true]);
        }

        if ($action === 'reset') {
            require_auth($pdo);
            $fresh = reset_state($pdo);
            json_response(['success' => true, 'data' => $fresh]);
        }

        json_response(['success' => false, 'message' => 'Acción no soportada.'], 400);
    } catch (Throwable $e) {
        json_response(['success' => false, 'message' => 'Error de servidor: ' . $e->getMessage()], 500);
    }
}
?>
<!doctype html>
<html lang="es-AR" class="h-full" x-data="AAPPApp()" x-init="init()">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>AAPP — Dashboard</title>

  <!-- Tailwind CDN -->
  <script src="https://cdn.tailwindcss.com"></script>

  <script defer src="app.constants.js"></script>
  <script defer src="app.state.js"></script>
  <script defer src="app.utils.js"></script>
  <script defer src="app.core.js"></script>
  <script defer src="app.filters.js"></script>
  <script defer src="app.relations.js"></script>
  <script defer src="app.reports.js"></script>
  <script defer src="app.bulk.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <script defer src="app.crud.js"></script>
  <script defer src="app.seeds.js"></script>
  <script defer src="app.js"></script>
  <!-- Alpine.js -->
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.x.x/dist/cdn.min.js"></script>

  <!-- FontAwesome -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css"/>

  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          boxShadow: {
            soft: '0 10px 25px rgba(0,0,0,.25)',
          }
        }
      }
    }
  </script>

  <style>
    :root{
      --blue-acc: 56 189 248; /* sky-400 */
      --blue-acc2: 59 130 246; /* blue-500 */
    }
    .glass {
      background: linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03));
      border: 1px solid rgba(255,255,255,.10);
      backdrop-filter: blur(10px);
    }
    .ring-blue-soft { box-shadow: 0 0 0 1px rgba(56,189,248,.20), 0 10px 25px rgba(0,0,0,.25); }
    .scrollbar::-webkit-scrollbar{ height:10px; width:10px; }
    .scrollbar::-webkit-scrollbar-thumb{ background: rgba(56,189,248,.25); border-radius: 999px; }
    .scrollbar::-webkit-scrollbar-track{ background: rgba(255,255,255,.04); }
    .badge {
      border: 1px solid rgba(56,189,248,.35);
      background: rgba(56,189,248,.08);
      color: rgb(186 230 253);
    }
    .btn {
      border: 1px solid rgba(56,189,248,.30);
      background: rgba(56,189,248,.10);
    }
    .btn:hover { background: rgba(56,189,248,.16); }
    .btn-danger {
      border: 1px solid rgba(239,68,68,.35);
      background: rgba(239,68,68,.10);
    }
    .btn-danger:hover { background: rgba(239,68,68,.16); }
    .input {
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.10);
      outline: none;
    }
    .input:focus {
      border-color: rgba(56,189,248,.55);
      box-shadow: 0 0 0 3px rgba(56,189,248,.15);
    }
    .table th { position: sticky; top: 0; background: rgba(2,6,23,.95); }
    [x-cloak] { display: none !important; }
  </style>
</head>

<body class="h-full bg-slate-950 text-slate-100" x-cloak>
  <div
    x-show="appLoading"
    class="fixed inset-0 z-50 flex items-center justify-center px-4 bg-slate-950"
    x-transition.opacity>
    <div class="glass rounded-2xl p-6 ring-blue-soft w-full max-w-md text-center space-y-3">
      <div class="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center glass ring-blue-soft">
        <i class="fa-solid fa-circle-notch fa-spin text-sky-300 text-xl"></i>
      </div>
      <div class="text-lg font-extrabold">Cargando panel…</div>
      <div class="text-sm text-slate-300">Preparando tus datos y sesión.</div>
    </div>
  </div>

  <div x-show="authChecking" class="min-h-screen flex items-center justify-center px-4">
    <div class="glass rounded-2xl p-6 ring-blue-soft w-full max-w-md text-center space-y-3">
      <div class="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center glass ring-blue-soft">
        <i class="fa-solid fa-circle-notch fa-spin text-sky-300 text-xl"></i>
      </div>
      <div class="text-lg font-extrabold">Verificando sesión…</div>
      <div class="text-sm text-slate-300">Cargando credenciales guardadas.</div>
    </div>
  </div>

  <div x-show="!isAuthenticated && !authChecking" x-cloak class="min-h-screen flex items-center justify-center px-4">
    <div class="glass rounded-2xl p-6 ring-blue-soft w-full max-w-md space-y-4">
      <div>
        <div class="text-sm uppercase tracking-wide text-slate-400">AAPP Manager</div>
        <h1 class="text-2xl font-extrabold">Iniciar sesión</h1>
        <p class="text-sm text-slate-300">Usuarios: <span class="font-semibold text-sky-200">admin@aapp.uno</span> y <span class="font-semibold text-sky-200">noelia@aapp.uno</span>.</p>
      </div>
      <div class="space-y-3">
        <div>
          <label class="text-xs text-slate-300">Email</label>
          <input class="input rounded-xl px-3 py-2 w-full" type="email" x-model="loginForm.email" placeholder="admin@aapp.uno" />
        </div>
        <div>
          <label class="text-xs text-slate-300">Contraseña</label>
          <input class="input rounded-xl px-3 py-2 w-full" type="password" x-model="loginForm.password" placeholder="••••••••" />
        </div>
        <p class="text-sm text-red-300" x-text="authError" x-show="authError"></p>
        <button class="btn rounded-xl px-3 py-2 w-full text-sm font-semibold" @click="login()">
          <i class="fa-solid fa-right-to-bracket text-sky-300 mr-2"></i>
          Entrar
        </button>
      </div>
    </div>
  </div>

  <div x-show="isAuthenticated && !authChecking" x-cloak class="min-h-screen md:flex">
    <!-- Sidebar (desktop) -->
    <aside class="hidden md:flex md:flex-col w-64 border-r border-white/10 bg-slate-950/80 backdrop-blur sticky top-0 h-screen">
      <div class="px-4 py-6 flex items-center gap-3">
        <div class="w-10 h-10 rounded-2xl flex items-center justify-center glass ring-blue-soft">
          <i class="fa-solid fa-layer-group text-sky-300"></i>
        </div>
        <div>
          <h1 class="text-base font-extrabold tracking-tight">
            AAPP
          </h1>
          <p class="text-xs text-slate-300">Dashboard local</p>
        </div>
      </div>

      <nav class="flex-1 px-4 space-y-2 overflow-y-auto scrollbar">
        <template x-for="t in tabs" :key="'side-' + t.key">
          <button
            class="w-full px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-3 border border-white/10"
            :class="activeTab === t.key ? 'bg-sky-500/15 border-sky-400/30 text-sky-200' : 'bg-white/5 hover:bg-white/8 text-slate-200'"
            @click="activeTab = t.key">
            <i class="fa-solid" :class="t.icon"></i>
            <span x-text="t.label"></span>
          </button>
        </template>
      </nav>

      <div class="p-4 text-xs text-slate-400">
        <div class="flex items-center justify-between">
          <span>Registros</span>
          <span class="badge px-2 py-1 rounded-lg" x-text="totalRecordsFiltered()"></span>
        </div>
      </div>
    </aside>

    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Topbar -->
      <header class="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur">
        <div class="w-full max-w-none px-4 py-4 flex flex-wrap items-center gap-3">
          <div class="w-10 h-10 rounded-2xl flex items-center justify-center glass ring-blue-soft md:hidden">
            <i class="fa-solid fa-layer-group text-sky-300"></i>
          </div>
          <div class="flex-1 md:hidden">
            <h1 class="text-lg md:text-xl font-extrabold tracking-tight">
              AAPP <span class="text-sky-300">•</span> Dashboard
            </h1>
            <p class="text-xs md:text-sm text-slate-300">
              Dashboard
            </p>
          </div>

          <div class="flex items-center gap-2 ml-auto flex-wrap justify-end">
            <div class="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 border border-white/10 bg-white/5">
              <i class="fa-solid fa-user text-sky-300"></i>
              <div class="leading-tight text-xs">
                <div class="font-semibold" x-text="authUser?.email || 'Sesión'"></div>
                <div class="text-slate-400" x-text="authUser?.role ? 'Rol: ' + authUser.role : ''"></div>
              </div>
            </div>

            <button class="btn rounded-xl px-3 py-2 text-sm flex items-center gap-2" @click="openModal('changePassword')">
              <i class="fa-solid fa-key text-sky-300"></i>
              <span class="hidden sm:inline">Cambiar clave</span>
            </button>

            <button class="btn-danger rounded-xl px-3 py-2 text-sm flex items-center gap-2" @click="logout()">
              <i class="fa-solid fa-arrow-right-from-bracket"></i>
              <span class="hidden sm:inline">Salir</span>
            </button>

            <button
              class="btn rounded-xl px-3 py-2 text-sm flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              @click="persist()"
              :disabled="saving">
              <i class="fa-solid" :class="saving ? 'fa-circle-notch fa-spin text-sky-300' : 'fa-floppy-disk text-sky-300'"></i>
              <span class="hidden sm:inline" x-text="saving ? 'Guardando…' : 'Guardar'"></span>
            </button>
            <div class="flex flex-col text-[11px] leading-tight text-slate-300">
              <span class="font-semibold" x-text="saveMessage || (db.meta.savedAt ? 'Guardado' : 'Sin guardar')"></span>
              <span class="text-slate-400" x-text="db.meta.savedAt ? new Date(db.meta.savedAt).toLocaleString('es-AR') : ''"></span>
            </div>

            <button class="btn rounded-xl px-3 py-2 text-sm flex items-center gap-2" @click="openModal('dataTools')">
              <i class="fa-solid fa-database text-sky-300"></i>
              <span class="hidden sm:inline">Datos</span>
            </button>

            <button class="btn rounded-xl px-3 py-2 text-sm flex items-center gap-2" @click="exportAllExcel()">
              <i class="fa-solid fa-file-excel text-sky-300"></i>
              <span class="hidden sm:inline">Exportar Excel</span>
            </button>

            <button class="btn rounded-xl px-3 py-2 text-sm flex items-center gap-2" @click="showSearch = !showSearch">
              <i class="fa-solid fa-magnifying-glass text-sky-300"></i>
              <span class="hidden sm:inline" x-text="showSearch ? 'Ocultar búsqueda' : 'Buscar'"></span>
            </button>
          </div>
        </div>
      </header>

      <!-- Main -->
      <main class="flex-1 w-full max-w-none px-4 py-6 pb-24 md:pb-6">

        <!-- Controls -->
        <section
          class="glass rounded-2xl p-3 ring-blue-soft"
          x-show="showSearch"
          x-transition
          x-cloak>
          <div class="flex flex-wrap items-start gap-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-slate-300">Sección</span>
              <span class="badge text-xs px-2 py-1 rounded-lg" x-text="tabs.find(t => t.key === activeTab)?.label || ''"></span>
            </div>
            <div class="w-full md:w-auto md:ml-auto flex flex-col md:flex-row md:items-center gap-2">
              <input class="input rounded-xl px-3 py-2 text-sm w-full md:w-64"
                     placeholder="Buscar por nombre / URL / notas…"
                     x-model="q" />
              <span class="badge text-xs px-2 py-1 rounded-lg md:self-auto" x-text="'Registros: ' + totalRecordsFiltered()"></span>
            </div>
          </div>
        </section>

        <!-- Content -->
        <section class="mt-4">
      <!-- Dashboard -->
      <div x-show="activeTab==='dashboard'" x-transition.opacity>
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Dashboard</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">KPIs • Salud • Resumen</span>
        </div>

        <!-- Quick KPIs -->
        <section class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-300">Empresas</div>
              <i class="fa-solid fa-building text-sky-300"></i>
            </div>
            <div class="mt-2 text-2xl font-extrabold" x-text="db.saas.length"></div>
            <div class="mt-2 text-xs text-slate-400">SaaS registradas</div>
          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-300">Clientes</div>
              <i class="fa-solid fa-users text-sky-300"></i>
            </div>
            <div class="mt-2 text-2xl font-extrabold" x-text="db.clients.length"></div>
            <div class="mt-2 text-xs text-slate-400">Con planes + extras</div>
          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-300">Ingresos (estim.)</div>
              <i class="fa-solid fa-arrow-trend-up text-emerald-300"></i>
            </div>
            <div class="mt-2 text-2xl font-extrabold">
              <span x-text="fmtMoney(totalIncomeEstimate())"></span>
            </div>
            <div class="mt-2 text-xs text-slate-400">Planes + extras (por frecuencia)</div>
          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-300">Ads (total)</div>
              <i class="fa-solid fa-bullhorn text-sky-300"></i>
            </div>
            <div class="mt-2 text-2xl font-extrabold">
              <span x-text="fmtMoney(totalAdsSpendAllTime())"></span>
            </div>
            <div class="mt-2 text-xs text-slate-400">Gasto total con impuestos</div>
          </div>
        </section>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
          <div class="glass rounded-2xl p-4 ring-blue-soft xl:col-span-2">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-extrabold">Ingresos vs Ads</h3>
              <span class="badge text-xs px-2 py-1 rounded-lg">Mensual estimado</span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-200">
              <div class="bg-white/5 rounded-xl p-3 border border-white/10">
                <div class="text-xs text-slate-400">Ingresos estimados</div>
                <div class="mt-1 font-extrabold text-lg" x-text="fmtMoney(totalIncomeEstimate())"></div>
              </div>
              <div class="bg-white/5 rounded-xl p-3 border border-white/10">
                <div class="text-xs text-slate-400">Ads total</div>
                <div class="mt-1 font-extrabold text-lg" x-text="fmtMoney(totalAdsSpendAllTime())"></div>
              </div>
              <div class="bg-white/5 rounded-xl p-3 border border-white/10">
                <div class="text-xs text-slate-400">Egresos manuales</div>
                <div class="mt-1 font-extrabold text-lg" x-text="fmtMoney(totalExpensesManual())"></div>
              </div>
            </div>

            <div class="mt-4">
              <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Ads sobre ingresos</span>
                <span x-text="Math.min(100, Math.round((totalAdsSpendAllTime() / Math.max(totalIncomeEstimate(), 1)) * 100)) + '%'"></span>
              </div>
              <div class="h-2 rounded-full bg-white/5 overflow-hidden">
                <div class="h-full bg-sky-400" :style="'width:' + Math.min(100, Math.round((totalAdsSpendAllTime() / Math.max(totalIncomeEstimate(), 1)) * 100)) + '%'"></div>
              </div>
            </div>
          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-extrabold">Balance estimado</h3>
              <i class="fa-solid fa-scale-balanced text-emerald-300"></i>
            </div>
            <div class="text-3xl font-extrabold" x-text="fmtMoney(balanceEstimate())"></div>
            <div class="mt-3 text-xs text-slate-400">Ingresos - egresos - ads</div>
            <div class="mt-4 space-y-2 text-sm text-slate-200">
              <div class="flex justify-between">
                <span>Planes</span>
                <span class="font-bold" x-text="fmtMoney(incomePlansMonthlyEstimate())"></span>
              </div>
              <div class="flex justify-between">
                <span>Extras</span>
                <span class="font-bold" x-text="fmtMoney(incomeExtrasMonthlyEstimate())"></span>
              </div>
              <div class="flex justify-between">
                <span>Ads (total)</span>
                <span class="font-bold" x-text="fmtMoney(totalAdsSpendAllTime())"></span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-extrabold">Ingresos por tipo</h3>
              <span class="badge text-xs px-2 py-1 rounded-lg">Estimado mensual</span>
            </div>
            <div class="space-y-4">
              <div>
                <div class="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span>Planes</span>
                  <span x-text="fmtMoney(incomePlansMonthlyEstimate())"></span>
                </div>
                <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-emerald-400" :style="'width:' + Math.min(100, Math.round((incomePlansMonthlyEstimate() / Math.max(totalIncomeEstimate(), 1)) * 100)) + '%'"></div>
                </div>
              </div>
              <div>
                <div class="flex items-center justify-between text-xs text-slate-300 mb-2">
                  <span>Extras</span>
                  <span x-text="fmtMoney(incomeExtrasMonthlyEstimate())"></span>
                </div>
                <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div class="h-full bg-sky-400" :style="'width:' + Math.min(100, Math.round((incomeExtrasMonthlyEstimate() / Math.max(totalIncomeEstimate(), 1)) * 100)) + '%'"></div>
                </div>
              </div>
            </div>
          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between mb-3">
              <h3 class="font-extrabold">Clientes por empresa</h3>
              <span class="badge text-xs px-2 py-1 rounded-lg">Cobertura</span>
            </div>
            <div class="space-y-3" x-show="db.saas.length">
              <template x-for="s in db.saas" :key="'dash-clients-'+s.id">
                <div>
                  <div class="flex items-center justify-between text-xs text-slate-300 mb-2">
                    <span x-text="s.name"></span>
                    <span x-text="countClientsBySaas(s.id)"></span>
                  </div>
                  <div class="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-400" :style="'width:' + Math.min(100, Math.round((countClientsBySaas(s.id) / maxClientsBySaas()) * 100)) + '%'"></div>
                  </div>
                </div>
              </template>
            </div>
            <div class="text-sm text-slate-400" x-show="db.saas.length===0">
              Cargá empresas para ver su distribución de clientes.
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div class="glass rounded-2xl overflow-hidden">
            <div class="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 class="font-extrabold">Empresas principales</h3>
              <span class="badge text-xs px-2 py-1 rounded-lg">Ingresos + Ads</span>
            </div>
            <div class="overflow-auto scrollbar">
              <table class="min-w-full table">
                <thead>
                  <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                    <th class="p-3">Empresa</th>
                    <th class="p-3">Clientes</th>
                    <th class="p-3">Planes</th>
                    <th class="p-3">Ingresos (est.)</th>
                    <th class="p-3">Ads (total)</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <template x-for="s in db.saas" :key="'dash-saas-'+s.id">
                    <tr class="border-b border-white/5 hover:bg-white/5">
                      <td class="p-3 font-semibold" x-text="s.name"></td>
                      <td class="p-3" x-text="countClientsBySaas(s.id)"></td>
                      <td class="p-3" x-text="countPlansBySaas(s.id)"></td>
                      <td class="p-3 font-bold" x-text="fmtMoney(incomeEstimateBySaas(s.id))"></td>
                      <td class="p-3" x-text="fmtMoney(totalAdsSpendBySaas(s.id))"></td>
                    </tr>
                  </template>
                  <tr x-show="db.saas.length===0">
                    <td class="p-6 text-slate-400" colspan="5">
                      Sin empresas cargadas todavía.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="glass rounded-2xl overflow-hidden">
            <div class="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 class="font-extrabold">Campañas recientes</h3>
              <span class="badge text-xs px-2 py-1 rounded-lg">Últimas 5</span>
            </div>
            <div class="overflow-auto scrollbar">
              <table class="min-w-full table">
                <thead>
                  <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                    <th class="p-3">Campaña</th>
                    <th class="p-3">Empresa</th>
                    <th class="p-3">Fecha</th>
                    <th class="p-3">Total</th>
                  </tr>
                </thead>
                <tbody class="text-sm">
                  <template x-for="c in db.campaigns.slice().reverse().slice(0, 5)" :key="'dash-camp-'+c.id">
                    <tr class="border-b border-white/5 hover:bg-white/5">
                      <td class="p-3 font-semibold" x-text="c.adName"></td>
                      <td class="p-3 text-sky-200 font-semibold" x-text="saasName(c.saasId)"></td>
                      <td class="p-3 text-slate-300" x-text="c.date"></td>
                      <td class="p-3 font-bold" x-text="fmtMoney(calcTotalWithTaxes(c))"></td>
                    </tr>
                  </template>
                  <tr x-show="db.campaigns.length===0">
                    <td class="p-6 text-slate-400" colspan="4">
                      Sin campañas registradas todavía.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- SaaS -->
      <div x-show="activeTab==='saas'" x-transition.opacity>
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Empresas SaaS</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Nombre • URL • Registro • Login • Relación</span>
          <div class="ml-auto">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="openModal('saasForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Nombre</th>
                  <th class="p-3">Logo</th>
                  <th class="p-3">URL</th>
                  <th class="p-3">Registro</th>
                  <th class="p-3">Login</th>
                  <th class="p-3">Clientes</th>
                  <th class="p-3">Planes</th>
                  <th class="p-3 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="s in filteredSaaS()" :key="s.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 font-semibold" x-text="s.name"></td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        <img
                          class="w-8 h-8 rounded-xl object-contain bg-white/5 border border-white/10"
                          :src="s.logoUrl"
                          :alt="s.name + ' logo'"
                          x-show="s.logoUrl"
                        />
                        <span class="text-slate-500 text-xs" x-show="!s.logoUrl">Sin logo</span>
                      </div>
                    </td>
                    <td class="p-3">
                      <a class="text-sky-300 hover:underline" :href="s.url" target="_blank" x-text="shortUrl(s.url)"></a>
                    </td>
                    <td class="p-3">
                      <a class="text-sky-300 hover:underline" :href="s.registerUrl" target="_blank" x-text="s.registerUrl ? 'Abrir' : '-'"></a>
                    </td>
                    <td class="p-3">
                      <a class="text-sky-300 hover:underline" :href="s.loginUrl" target="_blank" x-text="s.loginUrl ? 'Abrir' : '-'"></a>
                    </td>
                    <td class="p-3">
                      <span class="badge px-2 py-1 rounded-lg text-xs" x-text="countClientsBySaas(s.id)"></span>
                    </td>
                    <td class="p-3">
                      <span class="badge px-2 py-1 rounded-lg text-xs" x-text="countPlansBySaas(s.id)"></span>
                    </td>
                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editSaas(s.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delSaas(s.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredSaaS().length===0">
                  <td class="p-6 text-slate-400" colspan="8">
                    No hay registros. Agregá tus SaaS (ej: aapp.space, minitienda.uno).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Plans -->
      <div x-show="activeTab==='domains'" x-transition.opacity>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <div class="flex items-center gap-2">
            <h2 class="text-lg font-extrabold">Dominios</h2>
            <span class="badge text-xs px-2 py-1 rounded-lg">Por empresa • Opcional cliente</span>
          </div>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <select class="input rounded-xl px-3 py-2 text-sm" x-model="domainFilterSaasId">
              <option value="">Todas las empresas</option>
              <template x-for="s in db.saas" :key="'df-'+s.id">
                <option :value="s.id" x-text="s.name"></option>
              </template>
            </select>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetDomainForm(); openModal('domainForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Dominio</th>
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Cliente (opcional)</th>
                  <th class="p-3">Proveedor</th>
                  <th class="p-3">Estado</th>
                  <th class="p-3">Notas</th>
                  <th class="p-3 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="d in filteredDomains()" :key="'dom-'+d.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 font-semibold">
                      <span x-text="d.name"></span>
                    </td>
                    <td class="p-3">
                      <div class="flex items-center gap-2">
                        <template x-if="saasLogo(d.saasId)">
                          <img class="w-8 h-8 rounded-lg object-contain border border-white/10 bg-white/5" :src="saasLogo(d.saasId)" :alt="saasName(d.saasId)" />
                        </template>
                        <template x-if="!saasLogo(d.saasId)">
                          <div class="w-8 h-8 rounded-lg border border-white/10 bg-white/5 grid place-items-center text-xs text-slate-300">
                            <span x-text="(saasName(d.saasId) || '?').slice(0,1)"></span>
                          </div>
                        </template>
                        <div>
                          <div class="text-sky-200 font-semibold" x-text="saasName(d.saasId)"></div>
                          <div class="text-xs text-slate-400" x-text="d.saasId ? 'ID: '+d.saasId : 'Sin empresa'"></div>
                        </div>
                      </div>
                    </td>
                    <td class="p-3">
                      <div class="text-slate-200 font-semibold" x-text="clientName(d.clientId)"></div>
                      <div class="text-xs text-slate-500" x-text="d.clientId ? 'Cliente vinculado' : 'Opcional'"></div>
                    </td>
                    <td class="p-3 text-slate-300" x-text="d.provider || '-'"></td>
                    <td class="p-3">
                      <span class="badge text-xs px-2 py-1 rounded-lg" x-text="d.status || 'Activo'"></span>
                    </td>
                    <td class="p-3 text-slate-300" x-text="d.notes || '-'"></td>
                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editDomain(d.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delDomain(d.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredDomains().length===0">
                  <td class="p-6 text-slate-400" colspan="7">
                    No hay dominios cargados. Creá dominios y vinculalos a una empresa (y opcionalmente a un cliente).
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Plans -->
      <div x-show="activeTab==='plans'" x-transition.opacity>
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Planes</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Mensual • Anual • Empresa</span>
          <div class="ml-auto">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="openModal('planForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Título</th>
                  <th class="p-3">Frecuencia</th>
                  <th class="p-3">Precio</th>
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Descripción</th>
                  <th class="p-3">Características</th>
                  <th class="p-3">Variables</th>
                  <th class="p-3 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="p in filteredPlans()" :key="p.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 font-semibold" x-text="p.title"></td>
                    <td class="p-3">
                      <span class="badge px-2 py-1 rounded-lg text-xs" x-text="p.frequency"></span>
                    </td>
                    <td class="p-3 font-bold" x-text="fmtMoney(p.price)"></td>
                    <td class="p-3">
                      <span class="text-sky-200 font-semibold" x-text="saasName(p.saasId)"></span>
                    </td>
                    <td class="p-3 text-slate-300" x-text="p.description || '-'"></td>
                    <td class="p-3">
                      <div class="space-y-1">
                        <template x-for="(feature, idx) in (p.features || [])" :key="'plan-feature-'+p.id+'-'+idx">
                          <div class="flex items-center gap-2 text-xs">
                            <i class="fa-solid" :class="feature.enabled ? 'fa-check text-emerald-300' : 'fa-xmark text-red-300'"></i>
                            <span x-text="feature.label"></span>
                          </div>
                        </template>
                        <div class="text-xs text-slate-500" x-show="(p.features || []).length===0">-</div>
                      </div>
                    </td>
                    <td class="p-3">
                      <div class="space-y-1">
                        <template x-for="(feature, idx) in (p.variableFeatures || [])" :key="'plan-var-'+p.id+'-'+idx">
                          <div class="text-xs">
                            <span class="font-semibold" x-text="feature.key"></span>
                            <span class="text-slate-400">:</span>
                            <span x-text="feature.value"></span>
                          </div>
                        </template>
                        <div class="text-xs text-slate-500" x-show="(p.variableFeatures || []).length===0">-</div>
                      </div>
                    </td>
                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editPlan(p.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delPlan(p.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredPlans().length===0">
                  <td class="p-6 text-slate-400" colspan="8">
                    No hay planes todavía. Creá planes mensuales/anuales por empresa.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Campaigns -->
      <div x-show="activeTab==='campaigns'" x-transition.opacity>
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Campañas Publicitarias</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Impuestos auto • Resúmenes</span>
          <div class="ml-auto flex items-center gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="openModal('campaignForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar
            </button>
          </div>
        </div>

        <!-- Summary cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-300">Hoy (estim.)</div>
              <i class="fa-solid fa-calendar-day text-sky-300"></i>
            </div>
            <div class="mt-2 text-2xl font-extrabold" x-text="fmtMoney(adsSpendToday())"></div>
            <div class="mt-2 text-xs text-slate-400">Suma de (gasto_día + impuestos) por campaña</div>
          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-300">Semana (7 días)</div>
              <i class="fa-solid fa-calendar-week text-sky-300"></i>
            </div>
            <div class="mt-2 text-2xl font-extrabold" x-text="fmtMoney(adsSpendWeek())"></div>
            <div class="mt-2 text-xs text-slate-400">Hoy * 7 (estimación rápida)</div>
          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <div class="flex items-center justify-between">
              <div class="text-sm text-slate-300">Total (configurado)</div>
              <i class="fa-solid fa-sack-dollar text-sky-300"></i>
            </div>
            <div class="mt-2 text-2xl font-extrabold" x-text="fmtMoney(totalAdsSpendAllTime())"></div>
            <div class="mt-2 text-xs text-slate-400">Suma de gasto_total (con impuestos)</div>
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Anuncio / Nombre</th>
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Fecha</th>
                  <th class="p-3">Gasto por día</th>
                  <th class="p-3">Impuestos</th>
                  <th class="p-3">Gasto total</th>
                  <th class="p-3">Alcance</th>
                  <th class="p-3">Visualizaciones</th>
                  <th class="p-3">Costo por conversación</th>
                  <th class="p-3">Notas</th>
                  <th class="p-3 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="c in filteredCampaigns()" :key="c.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 font-semibold" x-text="c.adName"></td>
                    <td class="p-3 text-sky-200 font-semibold" x-text="saasName(c.saasId)"></td>
                    <td class="p-3 text-slate-300" x-text="c.date"></td>
                    <td class="p-3 font-bold" x-text="fmtMoney(c.dailySpend)"></td>
                    <td class="p-3" x-text="fmtMoney(calcTaxes(c))"></td>
                    <td class="p-3 font-extrabold" x-text="fmtMoney(calcTotalWithTaxes(c))"></td>
                    <td class="p-3 text-slate-300" x-text="c.reach || '-'"></td>
                    <td class="p-3 text-slate-300" x-text="c.views || '-'"></td>
                    <td class="p-3 text-slate-300" x-text="c.costPerConversation ? fmtMoney(c.costPerConversation) : '-'"></td>
                    <td class="p-3 text-slate-300" x-text="c.notes || '-'"></td>
                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editCampaign(c.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delCampaign(c.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredCampaigns().length===0">
                  <td class="p-6 text-slate-400" colspan="11">
                    Sin campañas. Registrá anuncios con gasto por día y total.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="mt-4 glass rounded-2xl p-4">
          <h3 class="font-extrabold mb-2">Reporte rápido (por empresa)</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <template x-for="s in db.saas" :key="'rep-'+s.id">
              <div class="border border-white/10 rounded-2xl p-4 bg-white/5">
                <div class="flex items-center justify-between">
                  <div class="font-extrabold text-sky-200" x-text="s.name"></div>
                  <span class="badge text-xs px-2 py-1 rounded-lg" x-text="'Campañas: ' + campaignsBySaas(s.id).length"></span>
                </div>
                <div class="mt-2 text-sm text-slate-300">
                  <div class="flex justify-between">
                    <span>Gasto total</span>
                    <span class="font-bold" x-text="fmtMoney(totalAdsSpendBySaas(s.id))"></span>
                  </div>
                  <div class="flex justify-between">
                    <span>Gasto diario (sum)</span>
                    <span class="font-bold" x-text="fmtMoney(sumDailySpendBySaas(s.id))"></span>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Registrar Campaña -->
      <div x-show="activeTab==='campaignRegister'" x-transition.opacity>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Registrar Campaña</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Carga rápida • Impacta en Campañas</span>
          <div class="ml-auto flex items-center gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetPosCampaignForm()">
              <i class="fa-solid fa-rotate text-sky-300 mr-2"></i>Limpiar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="activeTab='campaigns'">
              <i class="fa-solid fa-table-list text-sky-300 mr-2"></i>Ver listado
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl p-4 ring-blue-soft mb-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.posCampaign.saasId">
                <option value="">Seleccionar</option>
                <template x-for="s in db.saas" :key="'pos-camp-saas-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-300">Fecha</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="date" x-model="forms.posCampaign.date" />
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Anuncio / Nombre</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.posCampaign.adName" placeholder="Meta Ads / Lead Ads / etc" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Gasto por día (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.posCampaign.dailySpend" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Gasto total (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.posCampaign.totalSpend" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Alcance</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.posCampaign.reach" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Visualizaciones</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.posCampaign.views" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Costo por conversación (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.posCampaign.costPerConversation" />
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Notas</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.posCampaign.notes" placeholder="Notas y observaciones"></textarea>
            </div>
          </div>

          <div class="mt-4 flex justify-end flex-wrap gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetPosCampaignForm()">
              <i class="fa-solid fa-rotate text-sky-300 mr-2"></i>Limpiar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="savePosCampaign()">
              <i class="fa-solid fa-bullhorn text-sky-300 mr-2"></i>Registrar campaña
            </button>
          </div>
        </div>

        <div class="text-sm text-slate-400">
          Todo lo que cargues acá se suma automáticamente al listado de <span class="text-sky-200 font-semibold">Campañas</span>.
        </div>
      </div>

      <!-- Clients -->
      <div x-show="activeTab==='clients'" x-transition.opacity>
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Clientes</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Plan activo • Extras • Total • Credenciales</span>
          <div class="ml-auto">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="openModal('clientForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Nombre</th>
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Plan activo</th>
                  <th class="p-3">Extras</th>
                  <th class="p-3">Total</th>
                  <th class="p-3">Fecha</th>
                  <th class="p-3">Notas</th>
                  <th class="p-3 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="cl in filteredClients()" :key="cl.id">
                  <tr class="border-b border-white/5 hover:bg-white/5 align-top">
                    <td class="p-3 font-semibold">
                      <div x-text="cl.name"></div>
                      <div class="text-xs text-slate-400 mt-1">
                        <div><i class="fa-regular fa-envelope mr-1"></i><span x-text="cl.email || '-'"></span></div>
                        <div><i class="fa-solid fa-key mr-1"></i><span x-text="cl.password || '-'"></span></div>
                      </div>
                      <div class="text-xs mt-2" x-show="(cl.links||'').trim().length">
                        <i class="fa-solid fa-link text-sky-300 mr-1"></i>
                        <span class="text-slate-300" x-text="cl.links"></span>
                      </div>
                    </td>

                    <td class="p-3 text-sky-200 font-semibold" x-text="saasName(cl.saasId)"></td>

                    <td class="p-3">
                      <div class="font-bold" x-text="planTitle(cl.planId)"></div>
                      <div class="text-xs text-slate-400" x-text="planFrequency(cl.planId)"></div>
                      <div class="text-xs text-slate-400" x-text="fmtMoney(planPrice(cl.planId))"></div>
                    </td>

                    <td class="p-3">
                      <template x-if="(cl.extraIds||[]).length">
                        <div class="flex flex-wrap gap-2">
                          <template x-for="eid in cl.extraIds" :key="eid">
                            <span class="badge px-2 py-1 rounded-lg text-xs" x-text="extraName(eid)"></span>
                          </template>
                        </div>
                      </template>
                      <div x-show="!(cl.extraIds||[]).length" class="text-slate-400">-</div>
                    </td>

                    <td class="p-3 font-extrabold" x-text="fmtMoney(clientTotal(cl))"></td>

                    <td class="p-3 text-slate-300" x-text="cl.date || '-'"></td>
                    <td class="p-3 text-slate-300" x-text="cl.notes || '-'"></td>

                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editClient(cl.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delClient(cl.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredClients().length===0">
                  <td class="p-6 text-slate-400" colspan="8">
                    Sin clientes. Agregá clientes con plan activo y extras.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Extras -->
      <div x-show="activeTab==='extras'" x-transition.opacity>
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Servicios Extras</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Mensual • Anual • Única vez</span>
          <div class="ml-auto">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="openModal('extraForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Nombre</th>
                  <th class="p-3">Frecuencia</th>
                  <th class="p-3">Precio</th>
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Características</th>
                  <th class="p-3">Variables</th>
                  <th class="p-3 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="e in filteredExtras()" :key="e.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 font-semibold" x-text="e.name"></td>
                    <td class="p-3"><span class="badge text-xs px-2 py-1 rounded-lg" x-text="e.frequency"></span></td>
                    <td class="p-3 font-bold" x-text="fmtMoney(e.price)"></td>
                    <td class="p-3">
                      <span class="text-sky-200 font-semibold" x-text="saasName(e.saasId)"></span>
                    </td>
                    <td class="p-3">
                      <div class="space-y-1">
                        <template x-for="(feature, idx) in (e.features || [])" :key="'extra-feature-'+e.id+'-'+idx">
                          <div class="flex items-center gap-2 text-xs">
                            <i class="fa-solid" :class="feature.enabled ? 'fa-check text-emerald-300' : 'fa-xmark text-red-300'"></i>
                            <span x-text="feature.label"></span>
                          </div>
                        </template>
                        <div class="text-xs text-slate-500" x-show="(e.features || []).length===0">-</div>
                      </div>
                    </td>
                    <td class="p-3">
                      <div class="space-y-1">
                        <template x-for="(feature, idx) in (e.variableFeatures || [])" :key="'extra-var-'+e.id+'-'+idx">
                          <div class="text-xs">
                            <span class="font-semibold" x-text="feature.key"></span>
                            <span class="text-slate-400">:</span>
                            <span x-text="feature.value"></span>
                          </div>
                        </template>
                        <div class="text-xs text-slate-500" x-show="(e.variableFeatures || []).length===0">-</div>
                      </div>
                    </td>
                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editExtra(e.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delExtra(e.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredExtras().length===0">
                  <td class="p-6 text-slate-400" colspan="7">
                    Sin extras todavía. Ej: Dominio .com, Logo, Setup, Ads, etc.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Resellers -->
      <div x-show="activeTab==='resellers'" x-transition.opacity>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Precios Revendedor</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Planes + Extras • Costos • Precios sugeridos</span>
          <div class="ml-auto flex flex-wrap items-center gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetPlanForm(); openModal('planForm')">
              <i class="fa-solid fa-layer-group mr-2 text-sky-300"></i>Crear plan
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetResellerForm(); openModal('resellerForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="openModal('resellerHtml')">
              <i class="fa-solid fa-code mr-2 text-sky-300"></i>Generar HTML
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl p-4 mb-4 ring-blue-soft">
          <div class="text-sm text-slate-300">
            Armá precios revendedor basados en tus planes y extras actuales. Después generá una landing HTML estática con el detalle.
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Tipo</th>
                  <th class="p-3">Plan/Extra</th>
                  <th class="p-3">Frecuencia</th>
                  <th class="p-3">Costo</th>
                  <th class="p-3">Venta sugerida</th>
                  <th class="p-3">Entrega</th>
                  <th class="p-3">Requisitos</th>
                  <th class="p-3 w-40">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="r in filteredResellers()" :key="'reseller-' + r.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 text-sky-200 font-semibold" x-text="saasName(r.saasId)"></td>
                    <td class="p-3">
                      <span class="badge px-2 py-1 rounded-lg text-xs" x-text="resellerTypeLabel(r)"></span>
                    </td>
                    <td class="p-3 font-semibold" x-text="resellerBaseName(r)"></td>
                    <td class="p-3 text-slate-300" x-text="resellerBaseFrequency(r)"></td>
                    <td class="p-3 font-bold" x-text="fmtMoney(r.costPrice)"></td>
                    <td class="p-3 font-bold text-sky-200" x-text="fmtMoney(r.salePrice)"></td>
                    <td class="p-3 text-slate-300" x-text="r.deliveryTime || '-'"></td>
                    <td class="p-3 text-slate-300" x-text="r.requirements || '-'"></td>
                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editReseller(r.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delReseller(r.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredResellers().length===0">
                  <td class="p-6 text-slate-400" colspan="9">
                    No hay precios revendedor todavía. Creá precios basados en planes y extras existentes.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Partners -->
      <div x-show="activeTab==='partners'" x-transition.opacity>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Partners</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Red • Contactos • Comisión</span>
          <div class="ml-auto flex items-center gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetPartnerForm(); openModal('partnerForm')">
              <i class="fa-solid fa-plus mr-2 text-sky-300"></i>Agregar partner
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Nombre</th>
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Email</th>
                  <th class="p-3">Teléfono</th>
                  <th class="p-3">Comisión</th>
                  <th class="p-3">Notas</th>
                  <th class="p-3 w-36">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="p in filteredPartners()" :key="'partner-' + p.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 font-semibold" x-text="p.name"></td>
                    <td class="p-3 text-slate-300" x-text="p.company || '-'"></td>
                    <td class="p-3 text-sky-200" x-text="p.email || '-'"></td>
                    <td class="p-3 text-slate-300" x-text="p.phone || '-'"></td>
                    <td class="p-3 text-slate-200" x-text="p.commission ? p.commission + '%' : '-'"></td>
                    <td class="p-3 text-slate-300" x-text="p.notes || '-'"></td>
                    <td class="p-3">
                      <div class="flex gap-2">
                        <button class="btn rounded-xl px-3 py-2 text-xs" @click="editPartner(p.id)">
                          <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                        </button>
                        <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="delPartner(p.id)">
                          <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                </template>

                <tr x-show="filteredPartners().length===0">
                  <td class="p-6 text-slate-400" colspan="7">
                    No hay partners registrados todavía.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- POS -->
      <div x-show="activeTab==='pos'" x-transition.opacity>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">POS</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Venta rápida • Planes + Extras</span>
          <div class="ml-auto flex items-center gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetPosForm()">
              <i class="fa-solid fa-rotate text-sky-300 mr-2"></i>Limpiar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl p-4 ring-blue-soft mb-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-xs text-slate-300">Cliente</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.pos.buyerName" placeholder="Nombre y apellido" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Email</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.pos.buyerEmail" placeholder="cliente@mail.com" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.pos.saasId" @change="syncPosPlanToCompany()">
                <option value="">Seleccionar</option>
                <template x-for="s in db.saas" :key="'pos-saas-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-300">Plan</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.pos.planId">
                <option value="">Seleccionar plan</option>
                <template x-for="p in plansBySaas(forms.pos.saasId)" :key="'pos-plan-'+p.id">
                  <option :value="p.id" x-text="p.title + ' • ' + fmtMoney(p.price)"></option>
                </template>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-300">Fecha</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="date" x-model="forms.pos.date" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Método de pago</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.pos.paymentMethod">
                <option>Transferencia</option>
                <option>Tarjeta</option>
                <option>Mercado Pago</option>
                <option>Efectivo</option>
                <option>Otro</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Extras</label>
              <div class="flex flex-wrap gap-2">
                <template x-for="e in extrasBySaas(forms.pos.saasId)" :key="'pos-extra-'+e.id">
                  <label class="flex items-center gap-2 text-xs border border-white/10 rounded-xl px-3 py-2">
                    <input type="checkbox" class="accent-sky-400" :checked="(forms.pos.extraIds || []).includes(e.id)" @change="togglePosExtra(e.id, $event.target.checked)" />
                    <span x-text="e.name"></span>
                    <span class="text-slate-400" x-text="fmtMoney(e.price)"></span>
                  </label>
                </template>
                <div class="text-xs text-slate-400" x-show="extrasBySaas(forms.pos.saasId).length===0">Sin extras.</div>
              </div>
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Notas</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.pos.notes" placeholder="Notas de la venta"></textarea>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-sm text-slate-300">
              Total estimado: <span class="text-sky-200 font-extrabold" x-text="fmtMoney(posSaleTotal(forms.pos))"></span>
            </div>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="savePosSale()">
              <i class="fa-solid fa-cart-shopping text-sky-300 mr-2"></i>Registrar venta
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl p-4 ring-blue-soft mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div class="font-extrabold">Campañas rápidas</div>
            <div class="text-sm text-slate-300">Ahora se cargan desde <span class="font-semibold text-sky-200">Registrar Campaña</span>.</div>
          </div>
          <button class="btn rounded-xl px-3 py-2 text-sm" @click="activeTab='campaignRegister'">
            <i class="fa-solid fa-bullhorn text-sky-300 mr-2"></i>Ir a Registrar Campaña
          </button>
        </div>

        <div class="glass rounded-2xl overflow-hidden">
          <div class="overflow-auto scrollbar">
            <table class="min-w-full table">
              <thead>
                <tr class="text-left text-xs text-slate-300 border-b border-white/10">
                  <th class="p-3">Fecha</th>
                  <th class="p-3">Cliente</th>
                  <th class="p-3">Empresa</th>
                  <th class="p-3">Plan</th>
                  <th class="p-3">Extras</th>
                  <th class="p-3">Pago</th>
                  <th class="p-3">Total</th>
                  <th class="p-3 w-28">Acciones</th>
                </tr>
              </thead>
              <tbody class="text-sm">
                <template x-for="sale in filteredPosSales()" :key="'pos-sale-'+sale.id">
                  <tr class="border-b border-white/5 hover:bg-white/5">
                    <td class="p-3 text-slate-300" x-text="sale.date || '-'"></td>
                    <td class="p-3 font-semibold" x-text="sale.buyerName"></td>
                    <td class="p-3 text-sky-200" x-text="saasName(sale.saasId)"></td>
                    <td class="p-3 text-slate-300" x-text="planTitle(sale.planId)"></td>
                    <td class="p-3 text-slate-300" x-text="(sale.extraIds || []).map(id => extraName(id)).join(', ') || '-'"></td>
                    <td class="p-3 text-slate-300" x-text="sale.paymentMethod || '-'"></td>
                    <td class="p-3 font-bold" x-text="fmtMoney(posSaleTotal(sale))"></td>
                    <td class="p-3">
                      <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="removePosSale(sale.id)">
                        <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                      </button>
                    </td>
                  </tr>
                </template>
                <tr x-show="filteredPosSales().length===0">
                  <td class="p-6 text-slate-400" colspan="8">
                    Sin ventas registradas. Usá el formulario para cargar una compra rápida.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Tasks -->
      <div x-show="activeTab==='tasks'" x-transition.opacity>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Tareas</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">To-do • Estados • Kanban</span>
          <div class="ml-auto flex items-center gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetTaskForm()">
              <i class="fa-solid fa-rotate text-sky-300 mr-2"></i>Limpiar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl p-4 ring-blue-soft mb-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Título de la tarea</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.task.title" placeholder="Ej: Enviar propuesta / Revisar campaña" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Empresa (opcional)</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.task.saasId">
                <option value="">General</option>
                <template x-for="s in db.saas" :key="'task-saas-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-300">Estado</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.task.status">
                <option value="todo">Por hacer</option>
                <option value="doing">En progreso</option>
                <option value="done">Listo</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Notas (opcional)</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[70px]" x-model="forms.task.notes" placeholder="Contexto, links, responsables…"></textarea>
            </div>
          </div>

          <div class="mt-4 space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-xs text-slate-300">Checklist rápido</span>
              <select class="input rounded-xl px-3 py-2 text-sm" x-model="taskFormPreset" @change="applyTaskPreset()">
                <template x-for="preset in taskTemplates" :key="'preset-'+preset.key">
                  <option :value="preset.key" x-text="preset.label"></option>
                </template>
                <option value="custom">Personalizado</option>
              </select>
              <button class="btn rounded-xl px-3 py-2 text-xs" @click="addTaskCheckRow()">
                <i class="fa-solid fa-plus text-sky-300 mr-1"></i>Check
              </button>
            </div>
            <div class="flex flex-wrap gap-2">
              <template x-for="(chk, idx) in forms.task.checks" :key="'task-check-'+idx">
                <div class="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5">
                  <input type="checkbox" class="accent-sky-400" :checked="chk.done" @change="forms.task.checks[idx].done = $event.target.checked" />
                  <input class="bg-transparent text-sm outline-none" x-model="forms.task.checks[idx].label" />
                  <button class="text-xs text-red-300 hover:text-red-200" @click="removeTaskCheckRow(idx)">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                </div>
              </template>
              <div class="text-xs text-slate-400" x-show="forms.task.checks.length===0">Sin checks, podés agregarlos o usar un preset.</div>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div class="text-xs text-slate-300">
              Los checks son simples switches para seguir estados (brief, QA, entrega, etc.).
            </div>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveTask()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>
              <span x-text="forms.task.id ? 'Actualizar tarea' : 'Agregar tarea'"></span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <template x-for="col in taskColumns" :key="'col-'+col.key">
            <div class="glass rounded-2xl p-4 ring-blue-soft">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="w-2 h-2 rounded-full" :class="col.dot"></span>
                  <span class="font-extrabold" x-text="col.label"></span>
                </div>
                <span class="badge text-xs px-2 py-1 rounded-lg" x-text="tasksByStatus(col.key).length + ' tareas'"></span>
              </div>

              <div class="space-y-3">
                <template x-for="task in tasksByStatus(col.key)" :key="'task-'+task.id">
                  <div class="rounded-xl border border-white/10 bg-white/5 p-3">
                    <div class="flex items-start justify-between gap-3">
                      <div>
                        <div class="font-semibold" x-text="task.title"></div>
                        <div class="text-xs text-slate-400 mt-1">
                          <span class="badge text-[11px] px-2 py-1 rounded-lg" x-text="task.saasId ? saasName(task.saasId) : 'General'"></span>
                        </div>
                      </div>
                      <select class="input rounded-xl px-2 py-1 text-xs" :value="task.status" @change="updateTaskStatus(task.id, $event.target.value)">
                        <option value="todo">Por hacer</option>
                        <option value="doing">En progreso</option>
                        <option value="done">Listo</option>
                      </select>
                    </div>

                    <div class="mt-2 text-xs text-slate-300 flex items-center gap-2">
                      <span class="badge text-[11px] px-2 py-1 rounded-lg">Checklist</span>
                      <span x-text="taskProgress(task).done + '/' + taskProgress(task).total"></span>
                    </div>
                    <div class="flex flex-wrap gap-2 mt-2">
                      <template x-for="(chk, cidx) in task.checks" :key="'task-'+task.id+'-chk-'+cidx">
                        <label class="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-xs">
                          <input type="checkbox" class="accent-sky-400" :checked="chk.done" @change="toggleTaskCheck(task.id, cidx, $event.target.checked)" />
                          <span :class="chk.done ? 'line-through text-slate-400' : 'text-slate-200'" x-text="chk.label"></span>
                        </label>
                      </template>
                      <div class="text-xs text-slate-500" x-show="(task.checks || []).length===0">Sin checks.</div>
                    </div>

                    <div class="mt-3 text-xs text-slate-300">
                      <span class="text-slate-500">Notas:</span>
                      <span class="text-slate-200" x-text="task.notes || 'Sin notas'"></span>
                    </div>

                    <div class="mt-3 flex items-center gap-2">
                      <button class="btn rounded-xl px-3 py-2 text-xs" @click="editTask(task.id)">
                        <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                      </button>
                      <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="deleteTask(task.id)">
                        <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                      </button>
                    </div>
                  </div>
                </template>
                <div class="text-xs text-slate-400" x-show="tasksByStatus(col.key).length===0">
                  No hay tareas en esta columna todavía.
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- Notas -->
      <div x-show="activeTab==='notes'" x-transition.opacity>
        <div class="flex flex-wrap items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Notas por empresa</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Recordatorios • Links • Copiar rápido</span>
          <div class="ml-auto flex items-center gap-2">
            <select class="input rounded-xl px-3 py-2 text-sm" x-model="noteFilterSaasId">
              <option value="">Todas las empresas</option>
              <template x-for="s in db.saas" :key="'note-filter-'+s.id">
                <option :value="s.id" x-text="s.name"></option>
              </template>
            </select>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="resetNoteForm()">
              <i class="fa-solid fa-rotate text-sky-300 mr-2"></i>Limpiar
            </button>
          </div>
        </div>

        <div class="glass rounded-2xl p-4 ring-blue-soft mb-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.note.saasId">
                <option value="">General</option>
                <template x-for="s in db.saas" :key="'note-saas-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Título</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.note.title" placeholder="Ej: Accesos, onboarding, reuniones…" />
            </div>
            <div class="md:col-span-3">
              <label class="text-xs text-slate-300">Contenido</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.note.content" placeholder="Texto libre, links, pasos a seguir…"></textarea>
            </div>
          </div>

          <div class="mt-4 flex justify-between items-center gap-3">
            <p class="text-xs text-slate-300">Guardá notas cortas y copiables por empresa o generales.</p>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveNote()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>
              <span x-text="forms.note.id ? 'Actualizar nota' : 'Agregar nota'"></span>
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <template x-for="n in filteredNotes()" :key="'note-'+n.id">
            <div class="glass rounded-2xl p-4 ring-blue-soft flex flex-col gap-3">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold" x-text="n.title"></div>
                  <div class="text-xs text-slate-400" x-text="noteCompany(n)"></div>
                </div>
                <button class="btn rounded-xl px-3 py-2 text-xs" @click="copyNote(n.id)">
                  <i class="fa-solid fa-copy text-sky-300 mr-1"></i>Copiar
                </button>
              </div>
              <p class="text-sm text-slate-200 whitespace-pre-line flex-1" x-text="n.content"></p>
              <div class="flex items-center gap-2">
                <button class="btn rounded-xl px-3 py-2 text-xs" @click="editNote(n.id)">
                  <i class="fa-solid fa-pen-to-square text-sky-300 mr-1"></i>Editar
                </button>
                <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="deleteNote(n.id)">
                  <i class="fa-solid fa-trash text-red-300 mr-1"></i>Borrar
                </button>
              </div>
            </div>
          </template>
          <div class="glass rounded-2xl p-4 ring-blue-soft text-sm text-slate-400" x-show="filteredNotes().length===0">
            No hay notas guardadas con el filtro actual.
          </div>
        </div>
      </div>

      <!-- Balance -->
      <div x-show="activeTab==='balance'" x-transition.opacity>
        <div class="flex items-center gap-2 mb-3">
          <h2 class="text-lg font-extrabold">Balance</h2>
          <span class="badge text-xs px-2 py-1 rounded-lg">Ingresos • Egresos • Ventas • Dominios • Extras</span>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <h3 class="font-extrabold mb-3">Resumen (estimado desde Clientes)</h3>

            <div class="space-y-2 text-sm text-slate-200">
              <div class="flex justify-between">
                <span>Ventas (cantidad clientes)</span>
                <span class="font-bold" x-text="db.clients.length"></span>
              </div>
              <div class="flex justify-between">
                <span>Ingresos (planes + extras normalizado/mes)</span>
                <span class="font-extrabold" x-text="fmtMoney(totalIncomeEstimate())"></span>
              </div>
              <div class="flex justify-between">
                <span>Ads (gasto diario total)</span>
                <span class="font-bold" x-text="fmtMoney(sumDailySpendAll())"></span>
              </div>
              <div class="flex justify-between">
                <span>Ads (gasto total con impuestos)</span>
                <span class="font-extrabold" x-text="fmtMoney(totalAdsSpendAllTime())"></span>
              </div>
            </div>

            <div class="mt-4 border-t border-white/10 pt-4">
              <h4 class="font-bold mb-2">Desglose (por tipo)</h4>
              <div class="space-y-2 text-sm text-slate-200">
                <div class="flex justify-between">
                  <span>Planes (estimado/mes)</span>
                  <span class="font-bold" x-text="fmtMoney(incomePlansMonthlyEstimate())"></span>
                </div>
                <div class="flex justify-between">
                  <span>Servicios extras (estimado/mes)</span>
                  <span class="font-bold" x-text="fmtMoney(incomeExtrasMonthlyEstimate())"></span>
                </div>
                <div class="flex justify-between">
                  <span>Dominios contratados (conteo)</span>
                  <span class="font-bold" x-text="domainExtrasCount()"></span>
                </div>
              </div>
            </div>

          </div>

          <div class="glass rounded-2xl p-4 ring-blue-soft">
            <h3 class="font-extrabold mb-3">Egresos manuales (opcional)</h3>
            <p class="text-sm text-slate-300 mb-4">
              Si querés llevar egresos que no salen de campañas (sueldos, hosting, etc.), registralos acá.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input class="input rounded-xl px-3 py-2 text-sm" placeholder="Concepto" x-model="expenseForm.name" />
              <input class="input rounded-xl px-3 py-2 text-sm" placeholder="Monto (ARS)" type="number" x-model.number="expenseForm.amount" />
              <input class="input rounded-xl px-3 py-2 text-sm" placeholder="Fecha (YYYY-MM-DD)" x-model="expenseForm.date" />
            </div>

            <div class="mt-3 flex gap-2">
              <button class="btn rounded-xl px-3 py-2 text-sm" @click="addExpense()">
                <i class="fa-solid fa-plus text-sky-300 mr-2"></i>Agregar egreso
              </button>
              <button class="btn-danger rounded-xl px-3 py-2 text-sm" @click="clearExpenses()">
                <i class="fa-solid fa-trash text-red-300 mr-2"></i>Limpiar
              </button>
            </div>

            <div class="mt-4">
              <div class="flex items-center justify-between mb-2">
                <div class="font-bold">Lista de egresos</div>
                <div class="badge text-xs px-2 py-1 rounded-lg" x-text="'Total: ' + fmtMoney(totalExpensesManual())"></div>
              </div>

              <div class="max-h-64 overflow-auto scrollbar rounded-2xl border border-white/10">
                <template x-for="(ex, idx) in db.expenses" :key="'ex-'+idx">
                  <div class="flex items-center justify-between px-3 py-2 border-b border-white/5 bg-white/5">
                    <div class="text-sm">
                      <div class="font-semibold" x-text="ex.name"></div>
                      <div class="text-xs text-slate-400" x-text="ex.date || '-'"></div>
                    </div>
                    <div class="flex items-center gap-3">
                      <div class="font-extrabold" x-text="fmtMoney(ex.amount)"></div>
                      <button class="btn-danger rounded-xl px-3 py-2 text-xs" @click="removeExpense(idx)">
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  </div>
                </template>
                <div class="p-4 text-slate-400 text-sm" x-show="db.expenses.length===0">
                  No hay egresos cargados.
                </div>
              </div>

              <div class="mt-4 border-t border-white/10 pt-4 text-sm">
                <div class="flex justify-between">
                  <span>Ingresos (estim.)</span>
                  <span class="font-bold" x-text="fmtMoney(totalIncomeEstimate())"></span>
                </div>
                <div class="flex justify-between">
                  <span>Egresos manuales</span>
                  <span class="font-bold" x-text="fmtMoney(totalExpensesManual())"></span>
                </div>
                <div class="flex justify-between">
                  <span>Ads total</span>
                  <span class="font-bold" x-text="fmtMoney(totalAdsSpendAllTime())"></span>
                </div>
                <div class="flex justify-between mt-2">
                  <span class="font-extrabold text-sky-200">Saldo (estim.)</span>
                  <span class="font-extrabold text-sky-200" x-text="fmtMoney(balanceEstimate())"></span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Settings/Help -->
      <div x-show="activeTab==='help'" x-transition.opacity>
        <div class="glass rounded-2xl p-5 ring-blue-soft">
          <h2 class="text-lg font-extrabold mb-2">Ayuda rápida</h2>
          <ul class="list-disc pl-6 text-sm text-slate-300 space-y-2">
            <li>Los datos se guardan en MySQL (ver <code>php/config.php</code>). Hacé backups con el exportador.</li>
            <li>Relaciones:
              <span class="text-sky-200 font-semibold">Planes</span> pertenecen a una <span class="text-sky-200 font-semibold">Empresa</span>;
              <span class="text-sky-200 font-semibold">Clientes</span> eligen un <span class="text-sky-200 font-semibold">Plan</span> y <span class="text-sky-200 font-semibold">Extras</span>.
            </li>
            <li>Campañas:
              <span class="text-sky-200 font-semibold">Gasto total = gasto por día + impuestos</span>.
              Acá calculamos: <span class="text-sky-200 font-semibold">Impuestos = (gasto total - gasto por día)</span>.
            </li>
            <li>En “Datos” podés exportar/importar JSON para backup o migración.</li>
            <li>El export de Excel incluye todas las secciones (incluye POS y Partners).</li>
          </ul>
        </div>
      </div>
    </section>
      </main>
    </div>
  </div>

  <!-- Mobile footer nav -->
  <footer class="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-slate-950/90 backdrop-blur">
    <div class="flex gap-2 px-3 py-2 overflow-x-auto scrollbar snap-x snap-mandatory">
      <template x-for="t in tabs" :key="'mobile-' + t.key">
        <button
          class="min-w-[84px] flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 snap-start"
          :class="activeTab === t.key ? 'bg-sky-500/15 border-sky-400/30 text-sky-200' : 'bg-white/5 hover:bg-white/8 text-slate-200'"
          @click="activeTab = t.key">
          <i class="fa-solid text-base" :class="t.icon"></i>
          <span x-text="t.label"></span>
        </button>
      </template>
    </div>
  </footer>

  <!-- Modal overlay -->
  <div x-show="modal.open" x-transition.opacity class="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/60" @click="closeModal()"></div>

    <div class="relative w-full max-w-2xl glass rounded-2xl shadow-soft border border-white/10">
      <div class="flex items-center justify-between p-4 border-b border-white/10">
        <div class="font-extrabold text-sky-200" x-text="modal.title"></div>
        <button class="btn-danger rounded-xl px-3 py-2 text-sm" @click="closeModal()">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="p-4 max-h-[75vh] overflow-auto scrollbar">
        <!-- SaaS Form -->
        <div x-show="modal.view==='saasForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Nombre</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.saas.name" placeholder="aapp.space / minitienda.uno" />
            </div>
            <div>
              <label class="text-xs text-slate-300">URL</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.saas.url" placeholder="https://aapp.space" />
            </div>
            <div>
              <label class="text-xs text-slate-300">URL del logo</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.saas.logoUrl" placeholder="https://.../logo.png" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Link de registro</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.saas.registerUrl" placeholder="https://..." />
            </div>
            <div>
              <label class="text-xs text-slate-300">Link de login</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.saas.loginUrl" placeholder="https://..." />
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveSaas()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Plan Form -->
        <div x-show="modal.view==='planForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.plan.saasId">
                <option value="">Seleccionar</option>
                <template x-for="s in db.saas" :key="'ps-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-300">Frecuencia</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.plan.frequency">
                <option>Por mes</option>
                <option>Por año</option>
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-300">Título</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.plan.title" placeholder="Básico / Premium" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Precio (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.plan.price" placeholder="100000" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Descripción</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.plan.description" placeholder="Qué incluye, límites, etc."></textarea>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Importar características desde otro plan</label>
              <div class="flex flex-wrap gap-2">
                <select class="input rounded-xl px-3 py-2 flex-1 min-w-[200px]" x-model="imports.plan">
                  <option value="">Seleccionar plan</option>
                  <template x-for="p in db.plans" :key="'plan-import-'+p.id">
                    <option :value="p.id" x-text="p.title + ' • ' + saasName(p.saasId)"></option>
                  </template>
                </select>
                <button class="btn rounded-xl px-3 py-2 text-sm" type="button" @click="importFeaturePreset('plan')">
                  <i class="fa-solid fa-download text-sky-300 mr-2"></i>Importar
                </button>
              </div>
            </div>

            <div class="md:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-xs text-slate-300">Características</label>
                <button class="btn rounded-xl px-3 py-1 text-xs" type="button" @click="addFeatureRow('plan')">
                  <i class="fa-solid fa-plus text-sky-300 mr-1"></i>Agregar
                </button>
              </div>
              <div class="space-y-2 mt-2">
                <template x-for="(feature, idx) in (forms.plan.features || [])" :key="'plan-feature-'+idx">
                  <div class="flex items-center gap-2">
                    <input class="input rounded-xl px-3 py-2 flex-1" x-model="feature.label" placeholder="Ej: Dominio incluido" />
                    <button class="btn rounded-xl px-3 py-2 text-xs" type="button" @click="feature.enabled = !feature.enabled">
                      <i class="fa-solid" :class="feature.enabled ? 'fa-check text-emerald-300' : 'fa-xmark text-red-300'"></i>
                    </button>
                    <button class="btn-danger rounded-xl px-3 py-2 text-xs" type="button" @click="removeFeatureRow('plan', idx)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </template>
                <div class="text-xs text-slate-500" x-show="(forms.plan.features || []).length===0">Sin características cargadas.</div>
              </div>
            </div>

            <div class="md:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-xs text-slate-300">Características variables (Key - Value)</label>
                <button class="btn rounded-xl px-3 py-1 text-xs" type="button" @click="addVariableFeatureRow('plan')">
                  <i class="fa-solid fa-plus text-sky-300 mr-1"></i>Agregar
                </button>
              </div>
              <div class="space-y-2 mt-2">
                <template x-for="(feature, idx) in (forms.plan.variableFeatures || [])" :key="'plan-var-'+idx">
                  <div class="flex flex-wrap items-center gap-2">
                    <input class="input rounded-xl px-3 py-2 flex-1 min-w-[140px]" x-model="feature.key" placeholder="Ej: Productos" />
                    <input class="input rounded-xl px-3 py-2 flex-1 min-w-[140px]" x-model="feature.value" placeholder="Ej: 10" />
                    <button class="btn-danger rounded-xl px-3 py-2 text-xs" type="button" @click="removeVariableFeatureRow('plan', idx)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </template>
                <div class="text-xs text-slate-500" x-show="(forms.plan.variableFeatures || []).length===0">Sin variables cargadas.</div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="savePlan()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Domain Form -->
        <div x-show="modal.view==='domainForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Dominio</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.domain.name" placeholder="ej: midominio.com.ar" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Proveedor</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.domain.provider" placeholder="Cloudflare, Nic.ar, etc" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.domain.saasId">
                <option value="">Seleccionar (obligatorio)</option>
                <template x-for="s in db.saas" :key="'dom-s-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-300">Cliente (opcional)</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.domain.clientId">
                <option value="">Sin cliente</option>
                <template x-for="cl in (forms.domain.saasId ? db.clients.filter(c => c.saasId === forms.domain.saasId) : db.clients)" :key="'dom-c-'+cl.id">
                  <option :value="cl.id" x-text="cl.name + ' • ' + saasName(cl.saasId)"></option>
                </template>
              </select>
            </div>
            <div>
              <label class="text-xs text-slate-300">Estado</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.domain.status">
                <option>Activo</option>
                <option>Pendiente</option>
                <option>Vencido</option>
                <option>En transferencia</option>
              </select>
            </div>
            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Notas</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.domain.notes" placeholder="Recordatorios, datos de facturación, etc"></textarea>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveDomain()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Campaign Form -->
        <div x-show="modal.view==='campaignForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.campaign.saasId">
                <option value="">Seleccionar</option>
                <template x-for="s in db.saas" :key="'cs-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-300">Fecha</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.campaign.date" placeholder="YYYY-MM-DD" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Anuncio / Nombre</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.campaign.adName" placeholder="Lead Ads / Campaña Navidad / etc" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Gasto por día (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.campaign.dailySpend" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Gasto total (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.campaign.totalSpend" />
              <div class="text-xs text-slate-400 mt-1">
                Impuestos = (total - diario) ⇒ <span class="text-sky-200 font-bold" x-text="fmtMoney(calcTaxes(forms.campaign))"></span>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-300">Alcance</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.campaign.reach" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Visualizaciones</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.campaign.views" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Costo por conversación (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.campaign.costPerConversation" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Notas</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.campaign.notes" placeholder="Notas y observaciones"></textarea>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveCampaign()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Extra Form -->
        <div x-show="modal.view==='extraForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.extra.saasId">
                <option value="">Seleccionar</option>
                <template x-for="s in db.saas" :key="'es-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-300">Nombre</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.extra.name" placeholder="Logo, Dominio, Setup, Ads, etc" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Frecuencia</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.extra.frequency">
                <option>Por mes</option>
                <option>Por año</option>
                <option>Única vez</option>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Precio (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.extra.price" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Importar características desde otro extra</label>
              <div class="flex flex-wrap gap-2">
                <select class="input rounded-xl px-3 py-2 flex-1 min-w-[200px]" x-model="imports.extra">
                  <option value="">Seleccionar extra</option>
                  <template x-for="e in db.extras" :key="'extra-import-'+e.id">
                    <option :value="e.id" x-text="e.name + ' • ' + saasName(e.saasId)"></option>
                  </template>
                </select>
                <button class="btn rounded-xl px-3 py-2 text-sm" type="button" @click="importFeaturePreset('extra')">
                  <i class="fa-solid fa-download text-sky-300 mr-2"></i>Importar
                </button>
              </div>
            </div>

            <div class="md:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-xs text-slate-300">Características</label>
                <button class="btn rounded-xl px-3 py-1 text-xs" type="button" @click="addFeatureRow('extra')">
                  <i class="fa-solid fa-plus text-sky-300 mr-1"></i>Agregar
                </button>
              </div>
              <div class="space-y-2 mt-2">
                <template x-for="(feature, idx) in (forms.extra.features || [])" :key="'extra-feature-'+idx">
                  <div class="flex items-center gap-2">
                    <input class="input rounded-xl px-3 py-2 flex-1" x-model="feature.label" placeholder="Ej: Incluye configuración" />
                    <button class="btn rounded-xl px-3 py-2 text-xs" type="button" @click="feature.enabled = !feature.enabled">
                      <i class="fa-solid" :class="feature.enabled ? 'fa-check text-emerald-300' : 'fa-xmark text-red-300'"></i>
                    </button>
                    <button class="btn-danger rounded-xl px-3 py-2 text-xs" type="button" @click="removeFeatureRow('extra', idx)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </template>
                <div class="text-xs text-slate-500" x-show="(forms.extra.features || []).length===0">Sin características cargadas.</div>
              </div>
            </div>

            <div class="md:col-span-2">
              <div class="flex items-center justify-between">
                <label class="text-xs text-slate-300">Características variables (Key - Value)</label>
                <button class="btn rounded-xl px-3 py-1 text-xs" type="button" @click="addVariableFeatureRow('extra')">
                  <i class="fa-solid fa-plus text-sky-300 mr-1"></i>Agregar
                </button>
              </div>
              <div class="space-y-2 mt-2">
                <template x-for="(feature, idx) in (forms.extra.variableFeatures || [])" :key="'extra-var-'+idx">
                  <div class="flex flex-wrap items-center gap-2">
                    <input class="input rounded-xl px-3 py-2 flex-1 min-w-[140px]" x-model="feature.key" placeholder="Ej: Productos" />
                    <input class="input rounded-xl px-3 py-2 flex-1 min-w-[140px]" x-model="feature.value" placeholder="Ej: 10" />
                    <button class="btn-danger rounded-xl px-3 py-2 text-xs" type="button" @click="removeVariableFeatureRow('extra', idx)">
                      <i class="fa-solid fa-trash"></i>
                    </button>
                  </div>
                </template>
                <div class="text-xs text-slate-500" x-show="(forms.extra.variableFeatures || []).length===0">Sin variables cargadas.</div>
              </div>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveExtra()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Client Form -->
        <div x-show="modal.view==='clientForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Nombre</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.client.name" placeholder="Nombre del cliente" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Fecha</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.client.date" placeholder="YYYY-MM-DD" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.client.saasId" @change="syncPlanToCompany()">
                <option value="">Seleccionar</option>
                <template x-for="s in db.saas" :key="'cl-s-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-300">Plan activo</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.client.planId">
                <option value="">Seleccionar</option>
                <template x-for="p in plansBySaas(forms.client.saasId)" :key="'cl-p-'+p.id">
                  <option :value="p.id" x-text="p.title + ' • ' + p.frequency + ' • ' + fmtMoney(p.price)"></option>
                </template>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Servicios extras</label>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1">
                <template x-for="e in extrasBySaas(forms.client.saasId)" :key="'ce-'+e.id">
                  <label class="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm">
                    <input type="checkbox" class="accent-sky-400"
                           :value="e.id"
                           @change="toggleClientExtra(e.id, $event.target.checked)"
                           :checked="(forms.client.extraIds||[]).includes(e.id)"/>
                    <span class="flex-1">
                      <span class="font-semibold" x-text="e.name"></span>
                      <span class="text-xs text-slate-400 ml-2" x-text="e.frequency + ' • ' + fmtMoney(e.price)"></span>
                    </span>
                  </label>
                </template>
                <div class="text-slate-400 text-sm" x-show="extrasBySaas(forms.client.saasId).length===0">
                  No hay extras para esta empresa.
                </div>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-300">Correo</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.client.email" placeholder="correo@..." />
            </div>

            <div>
              <label class="text-xs text-slate-300">Contraseña</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.client.password" placeholder="(guardado local)" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Enlaces</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.client.links" placeholder="Links relevantes (panel, drive, etc)" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Notas</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.client.notes" placeholder="Notas de seguimiento, estado, etc"></textarea>
            </div>
          </div>

          <div class="mt-3 text-sm text-slate-300">
            Total cliente (estimado): <span class="text-sky-200 font-extrabold" x-text="fmtMoney(clientTotal(forms.client))"></span>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveClient()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Reseller Form -->
        <div x-show="modal.view==='resellerForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.reseller.saasId" @change="syncResellerSource()">
                <option value="">Seleccionar</option>
                <template x-for="s in db.saas" :key="'rs-'+s.id">
                  <option :value="s.id" x-text="s.name"></option>
                </template>
              </select>
            </div>

            <div>
              <label class="text-xs text-slate-300">Tipo</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.reseller.sourceType" @change="syncResellerSource()">
                <option value="plan">Plan</option>
                <option value="extra">Extra</option>
              </select>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Plan / Extra</label>
              <select class="input rounded-xl px-3 py-2 w-full" x-model="forms.reseller.sourceId">
                <option value="">Seleccionar</option>
                <template x-if="forms.reseller.sourceType === 'plan'">
                  <template x-for="p in plansBySaas(forms.reseller.saasId)" :key="'rs-p-'+p.id">
                    <option :value="p.id" x-text="p.title + ' • ' + p.frequency + ' • ' + fmtMoney(p.price)"></option>
                  </template>
                </template>
                <template x-if="forms.reseller.sourceType === 'extra'">
                  <template x-for="e in extrasBySaas(forms.reseller.saasId)" :key="'rs-e-'+e.id">
                    <option :value="e.id" x-text="e.name + ' • ' + e.frequency + ' • ' + fmtMoney(e.price)"></option>
                  </template>
                </template>
              </select>
              <div class="text-xs text-slate-400 mt-1" x-show="forms.reseller.sourceType === 'plan' && plansBySaas(forms.reseller.saasId).length === 0">
                Primero creá planes para esta empresa.
              </div>
              <div class="text-xs text-slate-400 mt-1" x-show="forms.reseller.sourceType === 'extra' && extrasBySaas(forms.reseller.saasId).length === 0">
                Primero creá servicios extra para esta empresa.
              </div>
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Importar valores desde otro plan revendedor</label>
              <div class="flex flex-wrap gap-2">
                <select class="input rounded-xl px-3 py-2 flex-1 min-w-[200px]" x-model="imports.reseller">
                  <option value="">Seleccionar plan revendedor</option>
                  <template x-for="r in resellersBySaas(forms.reseller.saasId)" :key="'rs-import-'+r.id">
                    <option :value="r.id" x-text="resellerBaseName(r) + ' • ' + resellerTypeLabel(r)"></option>
                  </template>
                </select>
                <button class="btn rounded-xl px-3 py-2 text-sm" type="button" @click="importResellerPreset()">
                  <i class="fa-solid fa-download text-sky-300 mr-2"></i>Importar
                </button>
              </div>
            </div>

            <div>
              <label class="text-xs text-slate-300">Precio de costo (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.reseller.costPrice" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Precio sugerido (ARS)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.reseller.salePrice" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Tiempo aprox. de entrega</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.reseller.deliveryTime" placeholder="Ej: 2-3 días" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Requisitos</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.reseller.requirements" placeholder="Requisitos o materiales necesarios. Uno por línea."></textarea>
            </div>
          </div>

          <div class="mt-3 text-sm text-slate-300">
            Precio base actual: <span class="text-sky-200 font-extrabold" x-text="fmtMoney(resellerBasePrice(forms.reseller))"></span>
            <span class="text-slate-400 ml-2" x-text="resellerBaseFrequency(forms.reseller)"></span>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="saveReseller()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Partner Form -->
        <div x-show="modal.view==='partnerForm'">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-slate-300">Nombre</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.partner.name" placeholder="Nombre del partner" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Empresa</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.partner.company" placeholder="Agencia / Empresa" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Email</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.partner.email" placeholder="contacto@mail.com" />
            </div>

            <div>
              <label class="text-xs text-slate-300">Teléfono</label>
              <input class="input rounded-xl px-3 py-2 w-full" x-model="forms.partner.phone" placeholder="+54 11..." />
            </div>

            <div>
              <label class="text-xs text-slate-300">Comisión (%)</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="number" x-model.number="forms.partner.commission" />
            </div>

            <div class="md:col-span-2">
              <label class="text-xs text-slate-300">Notas</label>
              <textarea class="input rounded-xl px-3 py-2 w-full min-h-[90px]" x-model="forms.partner.notes" placeholder="Notas internas"></textarea>
            </div>
          </div>

          <div class="mt-4 flex gap-2">
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="savePartner()">
              <i class="fa-solid fa-floppy-disk text-sky-300 mr-2"></i>Guardar
            </button>
            <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
          </div>
        </div>

        <!-- Reseller HTML -->
        <div x-show="modal.view==='resellerHtml'">
          <div class="glass rounded-2xl p-4 border border-white/10">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <div class="font-extrabold">HTML estático</div>
                <div class="text-sm text-slate-300">Copiá el HTML para publicar una página de pricing.</div>
              </div>
              <div class="flex gap-2">
                <button class="btn rounded-xl px-3 py-2 text-sm" @click="refreshResellerHTML()">
                  <i class="fa-solid fa-rotate text-sky-300 mr-2"></i>Actualizar
                </button>
                <button class="btn rounded-xl px-3 py-2 text-sm" @click="copyResellerHTML()">
                  <i class="fa-solid fa-copy text-sky-300 mr-2"></i>Copiar HTML
                </button>
                <button class="btn rounded-xl px-3 py-2 text-sm" @click="downloadResellerHTML()">
                  <i class="fa-solid fa-download text-sky-300 mr-2"></i>Descargar HTML
                </button>
              </div>
            </div>
            <textarea class="input rounded-2xl px-3 py-2 w-full min-h-[220px]" x-model="resellerHtml" readonly></textarea>
          </div>
        </div>

        <!-- Change password -->
        <div x-show="modal.view==='changePassword'">
          <div class="space-y-3">
            <div>
              <label class="text-xs text-slate-300">Contraseña actual</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="password" x-model="passwordForm.current" placeholder="Actual" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Nueva contraseña</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="password" x-model="passwordForm.next" placeholder="Nueva" />
            </div>
            <div>
              <label class="text-xs text-slate-300">Repetir nueva contraseña</label>
              <input class="input rounded-xl px-3 py-2 w-full" type="password" x-model="passwordForm.confirm" placeholder="Repetir" />
            </div>
            <p class="text-sm" :class="passwordFeedback ? (passwordFeedback.toLowerCase().includes('actualizada') ? 'text-emerald-200' : 'text-red-300') : 'text-slate-400'">
              <span x-text="passwordFeedback || 'Mínimo 6 caracteres. Solo vos podés cambiar tu contraseña.'"></span>
            </p>
            <div class="flex gap-2 pt-1">
              <button class="btn rounded-xl px-3 py-2 text-sm" @click="submitPasswordChange()">
                <i class="fa-solid fa-key text-sky-300 mr-2"></i>Guardar nueva contraseña
              </button>
              <button class="btn rounded-xl px-3 py-2 text-sm" @click="closeModal()">Cancelar</button>
            </div>
          </div>
        </div>

        <!-- Data Tools -->
        <div x-show="modal.view==='dataTools'">
          <div class="space-y-3">
            <div class="glass rounded-2xl p-4 border border-white/10">
              <div class="flex items-center justify-between">
                <div>
                  <div class="font-extrabold">Exportar (backup)</div>
                  <div class="text-sm text-slate-300">Descargá un JSON con todo tu sistema.</div>
                </div>
                <button class="btn rounded-xl px-3 py-2 text-sm" @click="exportJSON()">
                  <i class="fa-solid fa-file-export text-sky-300 mr-2"></i>Exportar
                </button>
              </div>
            </div>

            <div class="glass rounded-2xl p-4 border border-white/10">
              <div class="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div class="font-extrabold">Exportar Excel</div>
                  <div class="text-sm text-slate-300">Descargá un Excel para editar o migrar.</div>
                </div>
                <button class="btn rounded-xl px-3 py-2 text-sm" @click="exportAllExcel()">
                  <i class="fa-solid fa-file-excel text-sky-300 mr-2"></i>Exportar Excel
                </button>
              </div>
              <div class="mt-3">
                <label class="text-xs text-slate-300">Importar Excel</label>
                <input class="input rounded-xl px-3 py-2 w-full" type="file" accept=".xlsx,.xls" @change="importExcelFile($event)" />
              </div>
            </div>

            <div class="glass rounded-2xl p-4 border border-white/10">
              <div class="font-extrabold">Importar (restaurar)</div>
              <div class="text-sm text-slate-300 mb-2">Pegá tu JSON y cargalo.</div>
              <textarea class="input rounded-2xl px-3 py-2 w-full min-h-[160px]" x-model="importText" placeholder='{"saas":[...],"plans":[...],...}'></textarea>
              <div class="mt-3 flex gap-2">
                <button class="btn rounded-xl px-3 py-2 text-sm" @click="importJSON()">
                  <i class="fa-solid fa-file-import text-sky-300 mr-2"></i>Importar
                </button>
              </div>
            </div>

            <div class="text-xs text-slate-400">
              Nota: Importar reemplaza todo el contenido actual.
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>

  
</body>
</html>
