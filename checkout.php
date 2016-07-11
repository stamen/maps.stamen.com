<?php
session_start();
require_once("./vendor/autoload.php");

if(file_exists(__DIR__ . "/.env")) {
    $dotenv = new Dotenv\Dotenv(__DIR__ . "/");
    $dotenv->load();
}

Braintree\Configuration::environment(getenv('BT_ENVIRONMENT'));
Braintree\Configuration::merchantId(getenv('BT_MERCHANT_ID'));
Braintree\Configuration::publicKey(getenv('BT_PUBLIC_KEY'));
Braintree\Configuration::privateKey(getenv('BT_PRIVATE_KEY'));

$amount = $_POST["amount"];
$nonce = $_POST["payment_method_nonce"];
$result = Braintree\Transaction::sale([
    'amount' => $amount,
    'paymentMethodNonce' => $nonce
]);

if ($result->success || !is_null($result->transaction)) {
    $transaction = $result->transaction;
    $_SESSION["success"] = $transaction->id;
} else {
    $errorString = "";
    foreach($result->errors->deepAll() as $error) {
        $errorString .= 'Error: ' . $error->code . ": " . $error->message . "\n";
    }
    $_SESSION["errors"] = $errorString;
}

header("Location: index.php");

?>
