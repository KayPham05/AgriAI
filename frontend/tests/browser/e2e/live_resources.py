"""Track a resource from the browser POST that created it."""

from contextlib import contextmanager
from urllib.parse import urlsplit
from uuid import UUID


@contextmanager
def created_resource(page, cleanup, token, path, delete_path=None):
    if not token:
        raise RuntimeError("An authenticated session is required for fixture cleanup")
    create_request = None
    action_error = None

    def track_create(request):
        nonlocal create_request
        if create_request is None and request.method == "POST" and urlsplit(request.url).path == path:
            create_request = request

    page.on("request", track_create)
    try:
        with page.expect_response(lambda reply: reply.request == create_request, timeout=60_000) as event:
            try:
                yield event
            except BaseException as error:
                if create_request is None:
                    raise
                # Keep the response waiter alive for the POST the action already sent.
                action_error = error
        response = event.value
        if not response.ok:
            raise AssertionError(f"Create {path} returned {response.status}")
        resource_id = UUID(response.json()["id"])
        location = urlsplit(response.url)
        url = location._replace(path=f"{delete_path or path}/{resource_id}", query="", fragment="").geturl()
        cleanup.callback(delete_created, page.request, url, token)
    except Exception as response_error:
        if action_error is not None:
            raise action_error from response_error
        raise
    finally:
        page.remove_listener("request", track_create)
    if action_error is not None:
        raise action_error


def delete_created(request, url, token):
    response = request.delete(url, headers={"Authorization": f"Bearer {token}"}, max_redirects=0)
    if not response.ok and response.status != 404:
        raise AssertionError(f"Fixture cleanup failed with HTTP {response.status}")
