<?php

$sent = false;

if ($_SERVER['REQUEST_METHOD'] == 'POST' || $_GET['test'] == 'send') {
    $style = array_key_exists('style', $_POST)
        ? $_POST['style']
        : $_GET['style'];
    $center = $_POST['center'];
    $description = stripslashes($_POST['description']);
    $sender = $_POST['sender'];
    if (stristr($sender, "@")) {
        $from_email = $sender;
    } else {
        $sender = 'anonymous';
        $from_email = '(no address provided) <maps@stamen.com>';
    }
    $ip = $_SERVER['REMOTE_ADDR'];
    $form_url = sprintf('http://%s%s', $_SERVER['HTTP_HOST'], $_SERVER['REQUEST_URI']);

    $subject = "[maps.stamen.com / ${style}]: Bug report @ ${center}";
    $message = <<<MESSAGE
Bug report from ${sender} ($ip):

\t${description}

http://maps.stamen.com/${style}/#${center}

-- 
feedback form @ $form_url
MESSAGE;

    $headers = sprintf("From: %s", $from_email);

    try {
        mail("maps@stamen.com", $subject, $message, $headers);
        $sent = true;
    } catch (Exception $error) {
        $message = $error;
    }
} else {
    $message = "Please use the feedback forms on each map page to submit bug reports.";
}

?>
<!DOCTYPE html>
<html>
    <head>
        <title>maps.stamen.com</title>
        <style type="text/css">
            @import url(css/bootstrap/bootstrap.css);
            @import url(css/screen.css);
        </style>
    </head>
    <body>
        <div id="header" class="navbar">
            <div class="navbar-inner">
                <div class="container">
                    <h1 class="brand"><a href="../">maps.stamen.com</a> / <span id="current-provider">feedback</span></h1>
                    <a id="stamen" class="brand" href="http://stamen.com">stamen</a>
                </div>
            </div>
        </div>

        <div id="content" class="container content">
            <?php if ($sent): ?>

            <h2>Thanks for your feedback!</h2>
            <p>We appreciate your help in tracking down issues with our maps.</p>
            <p>&mdash; your friends at <a href="http://stamen.com">Stamen</a></p>

            <?php else: ?>

            <h2>Houston, we have a problem:</h2>
            <p class="alert alert-danger"><?php echo htmlspecialchars($message); ?></p>
            <p>If you think there&rsquo;s something wrong on our end, please
            <a href="mailto:maps@stamen.com">email us</a> and 
            let us know what you were doing when you ran into the issue.
            Sorry about the mess!</p>
            <p>&mdash; your friends at <a href="http://stamen.com">Stamen</a></p>

            <?php endif; ?>
        </div>
    </body>
</html>
